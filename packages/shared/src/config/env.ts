import dotenv from "dotenv";
import { resolveWorkspacePath } from "../runtime/paths";

const originalEnv = { ...process.env };

dotenv.config({ path: resolveWorkspacePath(".env") });
dotenv.config({
  path: resolveWorkspacePath(`.env.${process.env.NODE_ENV || "development"}`),
  override: true,
});

Object.entries(originalEnv).forEach(([key, value]) => {
  process.env[key] = value;
});

const numberFromEnv = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const servicePort = (serviceName: string, envName: string, fallback: number) => {
  const val = process.env[envName];
  if (val) return numberFromEnv(val, fallback);

  if (process.env.SERVICE_NAME === serviceName && process.env.PORT) {
    const portNum = Number(process.env.PORT);
    // 5002 is the API Gateway port. Other microservices should not listen on it.
    if (portNum === 5002 && serviceName !== "api-gateway") {
      return fallback;
    }
    return numberFromEnv(process.env.PORT, fallback);
  }

  return fallback;
};

const ports = {
  gateway: numberFromEnv(
    process.env.API_GATEWAY_PORT ||
    process.env.GATEWAY_PORT ||
    (process.env.SERVICE_NAME === "api-gateway" || !process.env.SERVICE_NAME ? process.env.PORT : undefined),
    5002
  ),
  auth: servicePort("auth-service", "AUTH_SERVICE_PORT", 5101),
  user: servicePort("user-service", "USER_SERVICE_PORT", 5102),
  catalog: servicePort("catalog-service", "CATALOG_SERVICE_PORT", 5103),
  inventory: servicePort("inventory-service", "INVENTORY_SERVICE_PORT", 5104),
  order: servicePort("order-service", "ORDER_SERVICE_PORT", 5105),
  payment: servicePort("payment-service", "PAYMENT_SERVICE_PORT", 5106),
};

const serviceUrl = (envName: string, port: number) => process.env[envName] || `http://localhost:${port}`;

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: ports.gateway,
  ports,
  gatewayUrl: process.env.API_GATEWAY_URL || `http://localhost:${ports.gateway}`,
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
    auth: serviceUrl("AUTH_SERVICE_URL", ports.auth),
    user: serviceUrl("USER_SERVICE_URL", ports.user),
    catalog: serviceUrl("CATALOG_SERVICE_URL", ports.catalog),
    inventory: serviceUrl("INVENTORY_SERVICE_URL", ports.inventory),
    order: serviceUrl("ORDER_SERVICE_URL", ports.order),
    payment: serviceUrl("PAYMENT_SERVICE_URL", ports.payment),
  },
};
