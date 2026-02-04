import { startConsumer } from "./kafka/consumer.js";

console.log("Starting Kafka Consumer...");

startConsumer().catch((err) => {
  console.error("Kafka consumer failed:", err);
  process.exit(1);
});
