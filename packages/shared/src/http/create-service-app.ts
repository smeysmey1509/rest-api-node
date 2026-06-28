import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Router } from "express";
import { env } from "../config/env";
import { errorMiddleware, notFoundMiddleware } from "../middlewares/error.middleware";
import { resolveWorkspacePath } from "../runtime/paths";

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

  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));

  if (env.requestLogging) {
    app.use((req, _res, next) => {
      console.log(`[${new Date().toISOString()}] ${serviceName} PID:${process.pid} Path:${req.path}`);
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
