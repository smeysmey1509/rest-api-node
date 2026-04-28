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
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const activity_1 = __importDefault(require("./routes/activity"));
const noticaiton_1 = __importDefault(require("./routes/noticaiton"));
const activityConsumer_1 = require("./queue/activityConsumer");
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const rabbitmq_1 = require("./services/rabbitmq");
const notifcationConsumer_1 = require("./queue/notifcationConsumer");
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const PORT = 5003;
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
exports.io = new socket_io_1.Server(server, {
    cors: {
        origin: "http://localhost:5173",
        credentials: true
    }
});
app.use((0, cors_1.default)({ origin: "http://localhost:5173", credentials: true }));
app.use("/api/v1", activity_1.default);
app.use("/api/v1", noticaiton_1.default);
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield mongoose_1.default.connect("mongodb+srv://dbSmey:123@cluster0.dgk3xwx.mongodb.net/");
        console.log("✅ MongoDB Connected: Worker");
        (0, rabbitmq_1.connectRabbitMQ)();
        // Start consuming RabbitMQ
        yield (0, activityConsumer_1.consumeActivityLogs)();
        yield (0, notifcationConsumer_1.consumeNotifs)();
        app.listen(PORT, () => {
            console.log(`🚀 Worker service running on port ${PORT}`);
        });
    }
    catch (err) {
        console.error("❌ MongoDB connection failed:", err);
        process.exit(1);
    }
});
exports.io.on("connection", (socket) => {
    console.log("🔌 Client connected to Worker:", socket.id);
    socket.on("disconnect", () => {
        console.log("❌ Client disconnected:", socket.id);
    });
});
startServer();
