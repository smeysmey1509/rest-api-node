import { env } from "./env";

export const rabbitmqConfig = {
  url: env.rabbitmqUrl,
  productActivityQueue: env.productActivityQueue,
};
