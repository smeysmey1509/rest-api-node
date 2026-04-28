import http from "http";
import { Server as SocketIOServer } from "socket.io";
import { connectRedis } from "./utils/cache";
import app from "../app";
import { connectDatabase } from "../config/db";
import { env } from "../config/env";

const server = http.createServer(app);
export let io: SocketIOServer;

connectRedis().catch(console.error);

io = new SocketIOServer(server, {
    cors: {
        origin: env.corsOrigin,
        credentials: true,
    },
});

connectDatabase()
    .then(() => {
        console.log(`[${process.pid}] Connected to MongoDB: Main`);

        server.listen(env.port, () => {
            console.log(`[${process.pid}] Server running on port ${env.port}`);
        });
    })
    .catch((err: Error) => {
        console.error(`[${process.pid}] MongoDB connection failed:`, err);
    });

io.on("connection", (socket) => {
    console.log("🔌 New client connected:", socket.id);
    socket.on("disconnect", () => {
        console.log("❌ Client disconnected:", socket.id);
    });
});
