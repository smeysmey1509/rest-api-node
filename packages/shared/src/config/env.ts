import dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5002),
  serviceName: process.env.SERVICE_NAME || "rest-api-node",
  mongoUri: process.env.MONGO_URI || "",
  authMongoUri: process.env.AUTH_MONGO_URI || process.env.MONGO_URI || "",
  userMongoUri: process.env.USER_MONGO_URI || process.env.MONGO_URI || "",
  catalogMongoUri: process.env.CATALOG_MONGO_URI || process.env.MONGO_URI || "",
  inventoryMongoUri: process.env.INVENTORY_MONGO_URI || process.env.MONGO_URI || "",
  orderMongoUri: process.env.ORDER_MONGO_URI || process.env.MONGO_URI || "",
  paymentMongoUri: process.env.PAYMENT_MONGO_URI || process.env.MONGO_URI || "",
  redisUrl: process.env.REDIS_URL,
  rabbitmqUrl: process.env.RABBITMQ_URL,
  productActivityQueue: process.env.PRODUCT_ACTIVITY_QUEUE || "product.activity",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  proxyTarget: process.env.PROXY_TARGET,
  requestLogging: process.env.REQUEST_LOGGING === "true",
  services: {
    auth: process.env.AUTH_SERVICE_URL || "http://localhost:5101",
    user: process.env.USER_SERVICE_URL || "http://localhost:5102",
    catalog: process.env.CATALOG_SERVICE_URL || "http://localhost:5103",
    inventory: process.env.INVENTORY_SERVICE_URL || "http://localhost:5104",
    order: process.env.ORDER_SERVICE_URL || "http://localhost:5105",
    payment: process.env.PAYMENT_SERVICE_URL || "http://localhost:5106",
  },
};
