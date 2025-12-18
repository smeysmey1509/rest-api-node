import dotenv from "dotenv";

dotenv.config();

export interface EnvConfig {
  nodeEnv: string;
  port: number;
  corsOrigin: string;
  proxyTarget?: string;
  mongoUri: string;
  mongoPoolSize: number;
}

function numberFromEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env: EnvConfig = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: numberFromEnv(process.env.PORT, 5002),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  proxyTarget: process.env.PROXY_TARGET,
  mongoUri: process.env.MONGO_URI ?? "",
  mongoPoolSize: numberFromEnv(process.env.MONGO_MAX_POOL, 100),
};

if (!env.mongoUri) {
  console.warn("⚠️  MONGO_URI is not configured. The API server will fail to start without it.");
}
