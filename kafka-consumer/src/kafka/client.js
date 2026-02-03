// kafka/src/kafka/client.js
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'kafka-consumer-client',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

module.exports = kafka;
