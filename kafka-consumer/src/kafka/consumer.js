import kafka from "./client.js";
import { handleNotification } from "../handlers/notification.handler.js";

const consumer = kafka.consumer({
  groupId: "notification-consumer-group",
});

export const startConsumer = async () => {
  await consumer.connect();
  console.log("Kafka consumer connected");

  await consumer.subscribe({
    topic: process.env.KAFKA_TOPIC,
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const payload = JSON.parse(message.value.toString());
      await handleNotification(payload);
    },
  });
};
