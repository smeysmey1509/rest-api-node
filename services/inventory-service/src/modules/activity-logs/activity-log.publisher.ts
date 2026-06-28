import { rabbitmqConfig } from "@shared/config/rabbitmq";
import { publishToQueue } from "@shared/infrastructure/rabbitmq/rabbitmq.client";
import { ProductActivityPayload } from "./activity-log.types";

export const publishProductActivity = (payload: Omit<ProductActivityPayload, "occurredAt">) => {
  return publishToQueue(rabbitmqConfig.productActivityQueue, {
    ...payload,
    occurredAt: new Date().toISOString(),
  });
};
