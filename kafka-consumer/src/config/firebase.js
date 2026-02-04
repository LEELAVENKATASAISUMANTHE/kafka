import admin from "firebase-admin";
import fs from "fs";

const serviceAccountPath = "/app/firebase-service-account.json";

// Check if service account file exists
if (!fs.existsSync(serviceAccountPath)) {
  throw new Error(`❌ Firebase service account file not found at ${serviceAccountPath}`);
}

let serviceAccount;
try {
  const serviceAccountData = fs.readFileSync(serviceAccountPath, "utf8");
  serviceAccount = JSON.parse(serviceAccountData);
} catch (err) {
  throw new Error(`❌ Failed to read or parse Firebase service account: ${err.message}`);
}

// Validate required fields
const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
const missingFields = requiredFields.filter(field => !serviceAccount[field]);
if (missingFields.length > 0) {
  throw new Error(`❌ Missing required fields in service account: ${missingFields.join(', ')}`);
}

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('✅ Firebase Admin initialized successfully');
} catch (err) {
  throw new Error(`❌ Failed to initialize Firebase Admin: ${err.message}`);
}

export default admin;
