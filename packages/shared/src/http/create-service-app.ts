import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Router } from "express";
import mongoose from "mongoose";
import { env } from "../config/env";
import { isRabbitMQReady } from "../infrastructure/rabbitmq/rabbitmq.client";
import { isRedisReady } from "../infrastructure/redis/cache";
import { errorMiddleware, notFoundMiddleware } from "../middlewares/error.middleware";
import { requestContextMiddleware } from "../middlewares/request-context.middleware";
import { resolveWorkspacePath } from "../runtime/paths";
import { createLogger } from "../utils/logger";

type CreateServiceAppOptions = {
  serviceName: string;
  routes: Router;
  routeAliases?: string[];
  enableUploads?: boolean;
};

const startedAt = new Date();

const buildHealthPayload = (serviceName: string) => {
  const memoryUsage = process.memoryUsage();

  return {
    status: "ok",
    service: serviceName,
    environment: env.nodeEnv,
    pid: process.pid,
    uptimeSeconds: Math.round(process.uptime()),
    startedAt: startedAt.toISOString(),
    timestamp: new Date().toISOString(),
    memory: {
      rss: memoryUsage.rss,
      heapTotal: memoryUsage.heapTotal,
      heapUsed: memoryUsage.heapUsed,
      external: memoryUsage.external,
    },
  };
};

export const createServiceApp = ({
  serviceName,
  routes,
  routeAliases = [],
  enableUploads = false,
}: CreateServiceAppOptions) => {
  const app = express();
  const logger = createLogger(serviceName);

  app.disable("x-powered-by");
  app.use(requestContextMiddleware);
  app.use(express.json({ limit: process.env.REQUEST_BODY_LIMIT ?? "1mb" }));
  app.use(cookieParser());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use((_req, res, next) => {
    res.setHeader("x-content-type-options", "nosniff");
    res.setHeader("x-frame-options", "DENY");
    res.setHeader("referrer-policy", "no-referrer");
    next();
  });

  if (env.requestLogging) {
    app.use((req, _res, next) => {
      logger.info("http.request", {
        operation: `${req.method} ${req.path}`,
        requestId: req.requestId,
        correlationId: req.correlationId,
      });
      next();
    });
  }

  app.get(["/health", "/api/health", "/api/v1/health"], (_req, res) => {
    res.status(200).json({
      success: true,
      message: "Service is healthy",
      data: buildHealthPayload(serviceName),
    });
  });

  app.get(["/ready", "/api/ready", "/api/v1/ready"], (_req, res) => {
    const dependencies = {
      mongodb: mongoose.connection.readyState === 1,
      redis: env.redisUrl ? isRedisReady() : true,
      rabbitmq: env.rabbitmqUrl ? isRabbitMQReady() : true,
    };
    const ready = Object.values(dependencies).every(Boolean);
    res.status(ready ? 200 : 503).json({
      success: ready,
      data: { status: ready ? "ready" : "not_ready", service: serviceName, dependencies },
    });
  });

  app.use("/api/v1", routes);
  app.use("/api", routes);

  routeAliases.forEach((alias) => {
    app.use(alias, routes);
  });

  if (enableUploads) {
    app.use("/uploads", express.static(resolveWorkspacePath("uploads")));
  }

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
};
