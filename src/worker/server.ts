import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import activityRoutes from "./routes/activity";
import notificationRoute from "./routes/noticaiton";
import { consumeActivityLogs } from "./queue/activityConsumer";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import {connectRabbitMQ} from "./services/rabbitmq";
import {consumeNotifs} from "./queue/notifcationConsumer";
import cors from "cors";

const app = express();
const server = http.createServer(app);
const PORT = 5003;

app.use(express.json());
app.use(cookieParser());

export const io = new SocketIOServer(server,{
    cors: {
        origin: "http://localhost:5173",
        credentials: true
    }
});

app.use(cors({ origin: "http://localhost:5173", credentials: true }));

app.use("/api/v1", activityRoutes)
app.use("/api/v1", notificationRoute);

const startServer = async () => {
    try {
        await mongoose.connect("mongodb+srv://dbSmey:123@cluster0.dgk3xwx.mongodb.net/");
        console.log("✅ MongoDB Connected: Worker");
        connectRabbitMQ();

        // Start consuming RabbitMQ
        await consumeActivityLogs();
        await consumeNotifs();

        app.listen(PORT, () => {
            console.log(`🚀 Worker service running on port ${PORT}`);
        });
    } catch (err) {
        console.error("❌ MongoDB connection failed:", err);
        process.exit(1);
    }
};

io.on("connection", (socket) => {
    console.log("🔌 Client connected to Worker:", socket.id);
    socket.on("disconnect", () => {
        console.log("❌ Client disconnected:", socket.id);
    });
});

startServer();