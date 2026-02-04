import { Kafka } from "kafkajs";

const kafka = new Kafka({
  clientId: "notification-consumer",
  brokers: [process.env.KAFKA_BROKER],
  retry: {
    retries: 5
  }
});

export default kafka;
