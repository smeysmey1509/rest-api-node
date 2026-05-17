import dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5002),
  mongoUri: process.env.MONGO_URI || "",
  redisUrl: process.env.REDIS_URL,
  rabbitmqUrl: process.env.RABBITMQ_URL,
  productActivityQueue: process.env.PRODUCT_ACTIVITY_QUEUE || "product.activity",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  proxyTarget: process.env.PROXY_TARGET,
  requestLogging: process.env.REQUEST_LOGGING === "true",
};
