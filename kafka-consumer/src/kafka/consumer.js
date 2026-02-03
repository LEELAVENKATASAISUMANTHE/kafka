// kafka/src/kafka/consumer.js
const kafka = require('./client');

const consumer = kafka.consumer({ groupId: 'notification-group' });

module.exports = consumer;
