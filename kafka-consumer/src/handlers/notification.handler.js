import admin from "../config/firebase.js";

export const handleNotification = async (payload) => {
  try {
    const { tokens = [], title, body } = payload;

    if (!tokens.length) {
      console.warn("No FCM tokens found, skipping");
      return;
    }

    const multicastMessage = {
      webpush: {
        notification: {
          title,
          body,
          icon: "/icon-192.png",
        },
      },
      tokens,
    };

    const response =
      await admin.messaging().sendEachForMulticast(multicastMessage);

    console.log(
      `FCM sent → success: ${response.successCount}, failed: ${response.failureCount}`
    );
  } catch (err) {
    console.error("❌ Consumer processing error:", err);
    throw err;
  }
};