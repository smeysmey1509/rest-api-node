import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import { env } from "./config/env";
import apiRoutes from "./routes";
import { errorMiddleware, notFoundMiddleware } from "./shared/middlewares/error.middleware";

const app = express();
const startedAt = new Date();

const buildHealthPayload = () => {
  const memoryUsage = process.memoryUsage();

  return {
    status: "ok",
    service: "rest-api-node",
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

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: env.corsOrigin, credentials: true }));

if (env.requestLogging) {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] PID: ${process.pid}, Path: ${req.path}`);
    next();
  });
}

if (env.proxyTarget) {
  app.use(
    "/proxy",
    createProxyMiddleware({
      target: env.proxyTarget,
      changeOrigin: true,
      pathRewrite: { "^/proxy": "" },
    })
  );
}

app.get(["/health", "/api/health", "/api/v1/health"], (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Service is healthy",
    data: buildHealthPayload(),
  });
});

app.get("/debug", (_req, res) => {
  res.json({
    instance: `PM2 ID: ${process.env.pm2_id || "unknown"}`,
    pid: process.pid,
    port: env.port,
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/v1", apiRoutes);
app.use("/uploads", express.static("uploads"));
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
