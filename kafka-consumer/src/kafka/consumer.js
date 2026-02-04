import kafka from "./client.js";
import { handleNotification } from "../handlers/notification.handler.js";

const consumer = kafka.consumer({
  groupId: "notification-consumer-group",
});

export default consumer;

export const startConsumer = async () => {
  try {
    await consumer.connect();
    console.log("✅ Kafka consumer connected");

    await consumer.subscribe({
      topic: process.env.KAFKA_TOPIC,
      fromBeginning: false,
    });

    console.log(`📡 Subscribed to topic: ${process.env.KAFKA_TOPIC}`);

    await consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const messageValue = message.value?.toString();
          if (!messageValue) {
            console.warn("Empty message received, skipping");
            return;
          }
          
          const payload = JSON.parse(messageValue);
          await handleNotification(payload);
        } catch (err) {
          console.error("❌ Message processing error:", {
            error: err.message,
            offset: message.offset,
            partition: message.partition
          });
          // Don't throw - this would crash the consumer
          // Consider implementing DLQ (Dead Letter Queue) here
        }
      },
    });
  } catch (err) {
    console.error("❌ Failed to start consumer:", err);
    throw err;
  }
};
