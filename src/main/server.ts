import express from "express";
import http from "http";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import userRoutes from "./routes/user";
import productRoutes from "./routes/product";
import categoryRoutes from "./routes/category";
import roleRoutes from "./routes/role";
import sidebarItemRoute from './routes/sidebaritems'
import cartRoute from "./routes/cart"
import promocodeRoute from "./routes/promocode";
import deliveryRoute from './routes/delivery';
import reviewRoute from './routes/review';
import brandRoute from './routes/brand';
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import { connectRabbitMQ } from "./services/rabbitmq";
import { Server as SocketIOServer } from "socket.io";
import { connectRedis } from "./utils/cache";

dotenv.config();

const app = express();
const server = http.createServer(app);

// establish Redis connection (best effort)
connectRedis().catch(console.error);

// Setup Socket.IO
const io = new SocketIOServer(server, {
    cors: {
        origin: "http://localhost:5173",
        credentials: true,
    },
});

export { io };

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] PID: ${process.pid}, Path: ${req.path}`);
    next();
});

const proxyTarget = process.env.PROXY_TARGET;
console.log('proxyTarget:', proxyTarget);
if (proxyTarget) {
    app.use("/proxy", createProxyMiddleware({
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

app.use("/api/v1", sidebarItemRoute)
app.use("/api/v1", userRoutes);
app.use("/api/v1", productRoutes);
app.use("/api/v1", categoryRoutes);
app.use("/api/v1", roleRoutes);
app.use("/api/v1", cartRoute);
app.use("/api/v1", promocodeRoute);
app.use("/api/v1", deliveryRoute);
app.use("/api/v1", reviewRoute);
app.use("/api/v1", brandRoute);
app.use('/uploads', express.static('uploads'));

// Connect DB and then start server
mongoose
    .connect(process.env.MONGO_URI as string, {
        maxPoolSize: 100,
        useNewUrlParser: true,
        useUnifiedTopology: true,
    } as mongoose.ConnectOptions)
    .then(() => {
        console.log(`[${process.pid}] ✅ Connected aaato MongoDB: Main`);

        connectRabbitMQ().catch(console.error);

        server.listen(process.env.PORT || 5002, () => {
            console.log(`[${process.pid}] 🚀 Server running on port ${process.env.PORT || 5002}`);
        });
    })
    .catch((err: Error) => {
        console.error(`[${process.pid}] ❌ MongoDB connection failed:`, err);
    });

io.on("connection", (socket) => {
    console.log("🔌 New client connected:", socket.id);
    socket.on("disconnect", () => {
        console.log("❌ Client disconnected:", socket.id);
    });
});