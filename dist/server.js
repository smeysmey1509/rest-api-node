"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
require("./register-paths");
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const app_1 = __importDefault(require("@/app"));
const database_1 = require("@/config/database");
const env_1 = require("@/config/env");
const cache_1 = require("@/infrastructure/redis/cache");
const rabbitmq_client_1 = require("@/infrastructure/rabbitmq/rabbitmq.client");
const server = http_1.default.createServer(app_1.default);
exports.io = new socket_io_1.Server(server, {
    cors: {
        origin: env_1.env.corsOrigin,
        credentials: true,
    },
});
const bootstrap = () => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, database_1.connectDatabase)();
    console.log(`[${process.pid}] Connected to MongoDB`);
    yield Promise.all([
        (0, cache_1.connectRedis)().catch((error) => console.error("Redis connection skipped:", error)),
        (0, rabbitmq_client_1.connectRabbitMQ)(),
    ]);
    server.listen(env_1.env.port, () => {
        console.log(`[${process.pid}] Server running on port ${env_1.env.port}`);
    });
});
exports.io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});
bootstrap().catch((err) => {
    console.error(`[${process.pid}] Server startup failed:`, err);
    process.exit(1);
});
