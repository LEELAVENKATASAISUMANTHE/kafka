# infra

Kubernetes infrastructure manifests for all shared services running on the K3s cluster hosted on DigitalOcean at **134.209.159.132** with domain **sumantheluri.tech**.

Managed services: MongoDB 7, Redis 7, Redpanda (Kafka), Redpanda Console, PostgreSQL 16.
All data is backed up nightly to Cloudflare R2.

---

## Folder structure

```
infra/
├── k3s/
│   ├── namespace.yaml          — Kubernetes namespace "infra"
│   ├── secrets.yaml            — All credentials (replace placeholders before deploy)
│   ├── mongodb.yaml            — MongoDB 7 StatefulSet + Service + 10Gi PVC
│   ├── redis.yaml              — Redis 7 StatefulSet + Service + 2Gi PVC (appendonly)
│   ├── redpanda.yaml           — Redpanda v23.3.15 StatefulSet + Service + 5Gi PVC
│   ├── redpanda-console.yaml   — Console Deployment + Traefik Middleware + Ingress
│   ├── postgres.yaml           — PostgreSQL 16 StatefulSet + Service + 10Gi PVC
│   └── backup-cronjobs.yaml    — 3 nightly CronJobs + ConfigMap with backup scripts
└── .github/
    └── workflows/
        └── deploy-infra.yml    — GitHub Actions: apply manifests on push to main
```

---

## Internal DNS addresses

All services are ClusterIP-only (not reachable from outside the cluster except Redpanda Console via Ingress).

| Service              | Internal DNS                              | Port  |
|----------------------|-------------------------------------------|-------|
| MongoDB              | `mongodb.infra.svc.cluster.local`         | 27017 |
| Redis                | `redis.infra.svc.cluster.local`           | 6379  |
| Redpanda (Kafka)     | `redpanda.infra.svc.cluster.local`        | 9092  |
| Redpanda Schema Reg. | `redpanda.infra.svc.cluster.local`        | 8081  |
| Redpanda Admin API   | `redpanda.infra.svc.cluster.local`        | 9644  |
| Redpanda PandaProxy  | `redpanda.infra.svc.cluster.local`        | 8082  |
| PostgreSQL           | `postgres.infra.svc.cluster.local`        | 5432  |
| Redpanda Console     | `console.sumantheluri.tech` (public HTTPS)| 443   |

---

## Prerequisites

The cluster must already have these installed:
- **K3s** with Traefik ingress controller
- **cert-manager** with a `ClusterIssuer` named `letsencrypt-prod`
- **local-path-provisioner** (default in K3s) for PVCs

---

## Step 1 — Set secrets before deploying

Edit `k3s/secrets.yaml` and replace every `REPLACE_ME` value:

```yaml
stringData:
  MONGO_PASSWORD: "your-strong-mongo-password"
  REDIS_PASSWORD: "your-strong-redis-password"
  POSTGRES_PASSWORD: "your-strong-postgres-password"
  R2_ACCOUNT_ID: "your-cloudflare-account-id"
  R2_ACCESS_KEY_ID: "your-r2-access-key-id"
  R2_SECRET_ACCESS_KEY: "your-r2-secret-access-key"
  R2_BUCKET: "infra-backups"
```

**Do not commit real credentials.** For production, consider [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets) or [External Secrets Operator](https://external-secrets.io/).

---

## Step 2 — Add KUBE_CONFIG secret to GitHub

1. On your server, retrieve the kubeconfig:
   ```bash
   cat /etc/rancher/k3s/k3s.yaml
   ```
2. Replace `127.0.0.1` in the `server:` field with your server IP `134.209.159.132`.
3. Base64-encode it:
   ```bash
   cat /etc/rancher/k3s/k3s.yaml | base64 -w 0
   ```
4. In GitHub: go to **Settings → Secrets and variables → Actions → New repository secret**.
   - Name: `KUBE_CONFIG`
   - Value: the base64 string from step 3.

---

## Deploy order

The GitHub Actions workflow handles ordering automatically. To deploy manually:

```bash
kubectl apply -f k3s/namespace.yaml
kubectl apply -f k3s/secrets.yaml
kubectl apply -f k3s/mongodb.yaml
kubectl apply -f k3s/redis.yaml
kubectl apply -f k3s/redpanda.yaml
kubectl apply -f k3s/redpanda-console.yaml
kubectl apply -f k3s/postgres.yaml
kubectl apply -f k3s/backup-cronjobs.yaml
```

Verify everything is running:

```bash
kubectl get all -n infra
```

---

## Manually trigger a backup

Create a one-off Job from any CronJob:

```bash
# MongoDB
kubectl create job --from=cronjob/mongodb-backup manual-mongo-$(date +%s) -n infra

# Redis
kubectl create job --from=cronjob/redis-backup manual-redis-$(date +%s) -n infra

# PostgreSQL
kubectl create job --from=cronjob/postgres-backup manual-postgres-$(date +%s) -n infra
```

Follow logs:

```bash
kubectl logs -n infra -l app=mongodb-backup --follow
```

---

## Restore from R2 backup

All backups are at `backups/daily/<db>/YYYY-MM-DD.gz` in the `infra-backups` R2 bucket.

### MongoDB restore

```bash
# Download the backup
rclone copyto r2:infra-backups/backups/daily/mongodb/2024-01-15.gz /tmp/mongodb-restore.gz

# Restore (runs mongorestore reading from stdin)
gunzip -c /tmp/mongodb-restore.gz | mongorestore \
  --host=mongodb.infra.svc.cluster.local \
  --port=27017 \
  --username=root \
  --password=<MONGO_PASSWORD> \
  --authenticationDatabase=admin \
  --gzip \
  --archive
```

Or exec directly into the MongoDB pod:

```bash
kubectl exec -it -n infra mongodb-0 -- mongorestore \
  --username=root --password=<MONGO_PASSWORD> \
  --authenticationDatabase=admin --gzip --archive=/tmp/backup.gz
```

### Redis restore

```bash
# Download the backup
rclone copyto r2:infra-backups/backups/daily/redis/2024-01-15.gz /tmp/redis-restore.gz
gunzip /tmp/redis-restore.gz   # produces dump.rdb

# Copy the RDB into the Redis pod
kubectl cp /tmp/redis-restore.rdb infra/redis-0:/data/dump.rdb

# Restart Redis to load the dump
kubectl rollout restart statefulset/redis -n infra
```

### PostgreSQL restore

```bash
# Download the backup
rclone copyto r2:infra-backups/backups/daily/postgres/2024-01-15.gz /tmp/postgres-restore.gz

# Restore (pg_dumpall format)
gunzip -c /tmp/postgres-restore.gz | PGPASSWORD=<POSTGRES_PASSWORD> psql \
  -h postgres.infra.svc.cluster.local \
  -U postgres \
  -d postgres
```

Or pipe directly into the pod:

```bash
gunzip -c /tmp/postgres-restore.gz | kubectl exec -i -n infra postgres-0 -- \
  sh -c 'PGPASSWORD=$POSTGRES_PASSWORD psql -U postgres'
```

---

## Backup retention policy

| Type        | Condition                          | Kept for     |
|-------------|-------------------------------------|--------------|
| Daily       | All backups                        | 7 days       |
| Monthly     | Backup taken on the 1st of a month | Forever      |
| Quarterly   | Jan 1, Apr 1, Jul 1, Oct 1         | Forever (covered by monthly rule) |

Cleanup runs automatically at the end of each backup job.

---

## Redpanda Console access

Console is available at **https://console.sumantheluri.tech** but access is restricted to the Tailscale IP **100.99.85.17/32** via a Traefik `ipAllowList` Middleware. Connect to Tailscale before opening the URL.

---

## Connecting to services from other apps in the cluster

Use the ClusterIP DNS names directly in your application config:

```env
MONGODB_URI=mongodb://root:<password>@mongodb.infra.svc.cluster.local:27017/mydb?authSource=admin
REDIS_URL=redis://:<password>@redis.infra.svc.cluster.local:6379
KAFKA_BROKERS=redpanda.infra.svc.cluster.local:9092
SCHEMA_REGISTRY_URL=http://redpanda.infra.svc.cluster.local:8081
DATABASE_URL=postgresql://postgres:<password>@postgres.infra.svc.cluster.local:5432/mydb
```
