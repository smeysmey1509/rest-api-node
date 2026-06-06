import http from "http";
import { Express } from "express";
import { connectDatabase } from "../config/database";
import { connectRedis } from "../infrastructure/redis/cache";
import { connectRabbitMQ } from "../infrastructure/rabbitmq/rabbitmq.client";
import { createLogger } from "../utils/logger";

type StartServiceOptions = {
  app: Express;
  serviceName: string;
  port: number;
  mongoUriEnv?: string;
  connectRedisClient?: boolean;
  connectRabbit?: boolean;
};

export const startService = async ({
  app,
  serviceName,
  port,
  mongoUriEnv,
  connectRedisClient = true,
  connectRabbit = true,
}: StartServiceOptions) => {
  const logger = createLogger(serviceName);
  const server = http.createServer(app);

  await connectDatabase(mongoUriEnv ? process.env[mongoUriEnv] : undefined);
  logger.info("Connected to MongoDB");

  await Promise.all([
    connectRedisClient
      ? connectRedis().catch((error) => logger.warn("Redis connection skipped", error))
      : Promise.resolve(),
    connectRabbit ? connectRabbitMQ() : Promise.resolve(),
  ]);

  server.listen(port, () => {
    logger.info(`Listening on port ${port}`);
  });

  return server;
};
