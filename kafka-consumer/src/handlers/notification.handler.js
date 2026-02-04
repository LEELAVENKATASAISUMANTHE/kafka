import consumer from "../kafka/consumer.js";
import admin from "../config/firebase.js";

export const startNotificationConsumer = async () => {
  await consumer.connect();
  console.log("Kafka Consumer connected");

  await consumer.subscribe({
    topic: "notifications",
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const payload = JSON.parse(message.value.toString());

        const {
          tokens = [],
          title,
          body,
          data = {},
        } = payload;

        if (!tokens.length) {
          console.warn("No FCM tokens found, skipping");
          return;
        }

        const multicastMessage = {
          notification: { title, body },
          data: Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, String(v)])
          ),
          tokens,
        };

        const response =
          await admin.messaging().sendEachForMulticast(multicastMessage);

        console.log(
          `FCM sent → success: ${response.successCount}, failed: ${response.failureCount}`
        );

        // 🧹 cleanup invalid tokens
        response.responses.forEach((res, idx) => {
          if (!res.success) {
            const code = res.error.code;
            const badToken = tokens[idx];

            if (
              code === "messaging/registration-token-not-registered" ||
              code === "messaging/invalid-registration-token"
            ) {
              console.log("❌ Invalid token:", badToken);
              // send to DLQ / log / notify producer
            }
          }
        });
      } catch (err) {
        console.error("❌ Consumer processing error:", err);
      }
    },
  });
};
