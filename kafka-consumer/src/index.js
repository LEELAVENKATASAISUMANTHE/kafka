// kafka/src/index.js
require('dotenv').config();
const consumer = require('./kafka/consumer');
const handleNotification = require('./handlers/notification.handler');
const config = require('./config');

async function run() {
  await consumer.connect();
  await consumer.subscribe({ topic: config.KAFKA_TOPIC, fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      await handleNotification(message);
    },
  });
}

run().catch(console.error);
