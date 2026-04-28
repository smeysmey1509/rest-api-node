"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const http_1 = __importDefault(require("http"));
const rabbitmq_1 = require("./services/rabbitmq");
const socket_io_1 = require("socket.io");
const cache_1 = require("./utils/cache");
const app_1 = __importDefault(require("../app"));
const db_1 = require("../config/db");
const env_1 = require("../config/env");
const server = http_1.default.createServer(app_1.default);
(0, cache_1.connectRedis)().catch(console.error);
exports.io = new socket_io_1.Server(server, {
    cors: {
        origin: env_1.env.corsOrigin,
        credentials: true,
    },
});
(0, db_1.connectDatabase)()
    .then(() => {
    console.log(`[${process.pid}] Connected to MongoDB: Main`);
    (0, rabbitmq_1.connectRabbitMQ)().catch(console.error);
    server.listen(env_1.env.port, () => {
        console.log(`[${process.pid}] Server running on port ${env_1.env.port}`);
    });
})
    .catch((err) => {
    console.error(`[${process.pid}] MongoDB connection failed:`, err);
});
exports.io.on("connection", (socket) => {
    console.log("🔌 New client connected:", socket.id);
    socket.on("disconnect", () => {
        console.log("❌ Client disconnected:", socket.id);
    });
});
