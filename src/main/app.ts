import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Express, Request, Response } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { env, EnvConfig } from "./config/env";
import { createApiRouter } from "./api";

export function createApp(config: EnvConfig = env): Express {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({ origin: config.corsOrigin, credentials: true }));

  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] PID: ${process.pid}, Path: ${req.path}`);
    next();
  });

  if (config.proxyTarget) {
    console.log("proxyTarget:", config.proxyTarget);
    app.use(
      "/proxy",
      createProxyMiddleware({
        target: config.proxyTarget,
        changeOrigin: true,
        pathRewrite: { "^/proxy": "" },
      })
    );
  }

  app.get("/debug", (_req: Request, res: Response) => {
    res.json({
      instance: `PM2 ID: ${process.env.pm2_id || "unknown"}`,
      pid: process.pid,
      port: config.port,
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api", createApiRouter());

  app.use("/uploads", express.static("uploads"));

  return app;
}
