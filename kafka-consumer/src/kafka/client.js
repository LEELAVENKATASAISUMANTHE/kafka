import { Kafka } from "kafkajs";

if (!process.env.KAFKA_BROKER) {
  throw new Error('❌ KAFKA_BROKER environment variable is required');
}

const kafka = new Kafka({
  clientId: "notification-consumer",
  brokers: [process.env.KAFKA_BROKER],
  connectionTimeout: 10000,
  requestTimeout: 30000,
  retry: {
    retries: 10,
    initialRetryTime: 300,
    maxRetryTime: 30000,
  },
  logLevel: process.env.NODE_ENV === 'production' ? 2 : 4 // WARN in prod, DEBUG in dev
});

export default kafka;
