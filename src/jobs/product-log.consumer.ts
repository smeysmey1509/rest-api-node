import "../../packages/shared/src/register-paths";
import { connectRabbitMQ } from "@shared/infrastructure/rabbitmq/rabbitmq.client";

export const startProductLogConsumer = async () => {
  await connectRabbitMQ();
};
