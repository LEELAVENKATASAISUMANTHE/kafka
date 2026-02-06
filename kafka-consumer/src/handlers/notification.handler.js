import admin from "../config/firebase.js";

export const handleNotification = async (payload) => {
  try {
    const {
      tokens = [],
      title,
      body,
      // ❌ ignore data completely
    } = payload;

    if (!tokens.length) {
      console.warn("No FCM tokens found, skipping");
      return;
    }

    const multicastMessage = {
      notification: { title, body },
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
        }
      }
    });
  } catch (err) {
    console.error("❌ Consumer processing error:", err);
    throw err;
  }
};
