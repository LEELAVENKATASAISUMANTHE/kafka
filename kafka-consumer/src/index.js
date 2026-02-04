import { startConsumer } from "./kafka/consumer.js";
import consumer from "./kafka/consumer.js";

// Validate required environment variables
const requiredEnvs = ['KAFKA_BROKER', 'KAFKA_TOPIC'];
const missing = requiredEnvs.filter(env => !process.env[env]);
if (missing.length > 0) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

console.log("Starting Kafka Consumer...");

// Graceful shutdown handling
const shutdown = async () => {
  console.log('\n🛑 Shutting down gracefully...');
  try {
    await consumer.disconnect();
    console.log('✅ Kafka consumer disconnected');
  } catch (err) {
    console.error('❌ Error during shutdown:', err);
  }
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startConsumer().catch((err) => {
  console.error("Kafka consumer failed:", err);
  process.exit(1);
});
