import { AppError } from "../errors/app-error";

type ValidateEnvironmentOptions = {
  mongoUriEnv?: string;
  connectRedisClient: boolean;
  connectRabbit: boolean;
};

export const validateServiceEnvironment = ({
  mongoUriEnv,
  connectRedisClient,
  connectRabbit,
}: ValidateEnvironmentOptions): void => {
  const required = [mongoUriEnv ?? "MONGO_URI"];
  if (connectRedisClient) required.push("REDIS_URL");
  if (connectRabbit) required.push("RABBITMQ_URL");

  const missing = required.filter((name) => !process.env[name] && !(name.endsWith("_MONGO_URI") && process.env.MONGO_URI));
  if (process.env.NODE_ENV === "production") {
    required.push("JWT_SECRET", "JWT_REFRESH_SECRET");
    if (!process.env.CORS_ORIGIN) missing.push("CORS_ORIGIN");
    if (process.env.JWT_SECRET === "secret" || process.env.JWT_REFRESH_SECRET === "refresh-secret") {
      missing.push("secure JWT secrets");
    }
  }

  if (missing.length > 0) {
    throw new AppError(`Missing required environment configuration: ${[...new Set(missing)].join(", ")}`);
  }
};

