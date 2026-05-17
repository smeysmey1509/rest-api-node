"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const http_proxy_middleware_1 = require("http-proxy-middleware");
const env_1 = require("./config/env");
const routes_1 = __importDefault(require("./routes"));
const error_middleware_1 = require("./shared/middlewares/error.middleware");
const app = (0, express_1.default)();
const startedAt = new Date();
const buildHealthPayload = () => {
    const memoryUsage = process.memoryUsage();
    return {
        status: "ok",
        service: "rest-api-node",
        environment: env_1.env.nodeEnv,
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
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)({ origin: env_1.env.corsOrigin, credentials: true }));
if (env_1.env.requestLogging) {
    app.use((req, _res, next) => {
        console.log(`[${new Date().toISOString()}] PID: ${process.pid}, Path: ${req.path}`);
        next();
    });
}
if (env_1.env.proxyTarget) {
    app.use("/proxy", (0, http_proxy_middleware_1.createProxyMiddleware)({
        target: env_1.env.proxyTarget,
        changeOrigin: true,
        pathRewrite: { "^/proxy": "" },
    }));
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
        port: env_1.env.port,
        timestamp: new Date().toISOString(),
    });
});
app.use("/api/v1", routes_1.default);
app.use("/api", routes_1.default);
app.use("/uploads", express_1.default.static("uploads"));
app.use(error_middleware_1.notFoundMiddleware);
app.use(error_middleware_1.errorMiddleware);
exports.default = app;
