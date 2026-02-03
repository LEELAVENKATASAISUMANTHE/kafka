// kafka/src/handlers/notification.handler.js
module.exports = async function handleNotification(message) {
  // Process the notification message
  console.log('Received notification:', message.value.toString());
};
