import { connectRabbitMQ } from "../infrastructure/rabbitmq/rabbitmq.client";

export const startProductLogConsumer = async () => {
  await connectRabbitMQ();
};
