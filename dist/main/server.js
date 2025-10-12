"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const user_1 = __importDefault(require("./routes/user"));
const product_1 = __importDefault(require("./routes/product"));
const category_1 = __importDefault(require("./routes/category"));
const role_1 = __importDefault(require("./routes/role"));
const sidebaritems_1 = __importDefault(require("./routes/sidebaritems"));
const cart_1 = __importDefault(require("./routes/cart"));
const promocode_1 = __importDefault(require("./routes/promocode"));
const delivery_1 = __importDefault(require("./routes/delivery"));
const review_1 = __importDefault(require("./routes/review"));
const brand_1 = __importDefault(require("./routes/brand"));
const wishlist_1 = __importDefault(require("./routes/wishlist"));
const cors_1 = __importDefault(require("cors"));
const http_proxy_middleware_1 = require("http-proxy-middleware");
const rabbitmq_1 = require("./services/rabbitmq");
const socket_io_1 = require("socket.io");
const cache_1 = require("./utils/cache");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// establish Redis connection (best effort)
(0, cache_1.connectRedis)().catch(console.error);
// Setup Socket.IO
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "http://localhost:5173",
        credentials: true,
    },
});
exports.io = io;
// Middleware
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)({ origin: "http://localhost:5173", credentials: true }));
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] PID: ${process.pid}, Path: ${req.path}`);
    next();
});
const proxyTarget = process.env.PROXY_TARGET;
console.log('proxyTarget:', proxyTarget);
if (proxyTarget) {
    app.use("/proxy", (0, http_proxy_middleware_1.createProxyMiddleware)({
        target: proxyTarget,
        changeOrigin: true,
        pathRewrite: { "^/proxy": "" },
    }));
}
// Routes
app.get("/debug", (req, res) => {
    res.json({
        instance: `PM2 ID: ${process.env.pm2_id || "unknown"}`,
        pid: process.pid,
        port: process.env.PORT || 5002,
        timestamp: new Date().toISOString(),
    });
});
app.use("/api/v1", sidebaritems_1.default);
app.use("/api/v1", user_1.default);
app.use("/api/v1", product_1.default);
app.use("/api/v1", category_1.default);
app.use("/api/v1", role_1.default);
app.use("/api/v1", cart_1.default);
app.use("/api/v1", promocode_1.default);
app.use("/api/v1", delivery_1.default);
app.use("/api/v1", review_1.default);
app.use("/api/v1", brand_1.default);
app.use("/api/v1", wishlist_1.default);
app.use('/uploads', express_1.default.static('uploads'));
// Connect DB and then start server
mongoose_1.default
    .connect(process.env.MONGO_URI, {
    maxPoolSize: 100,
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => {
    console.log(`[${process.pid}] ✅ Connected aaato MongoDB: Main`);
    (0, rabbitmq_1.connectRabbitMQ)().catch(console.error);
    server.listen(process.env.PORT || 5002, () => {
        console.log(`[${process.pid}] 🚀 Server running on port ${process.env.PORT || 5002}`);
    });
})
    .catch((err) => {
    console.error(`[${process.pid}] ❌ MongoDB connection failed:`, err);
});
io.on("connection", (socket) => {
    console.log("🔌 New client connected:", socket.id);
    socket.on("disconnect", () => {
        console.log("❌ Client disconnected:", socket.id);
    });
});
