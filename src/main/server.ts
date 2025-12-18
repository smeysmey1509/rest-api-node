import http from "http";
import mongoose from "mongoose";
import { Server as SocketIOServer } from "socket.io";
import { env } from "./config/env";
import { createApp } from "./app";
import { connectRabbitMQ } from "./services/rabbitmq";
import { connectRedis } from "./utils/cache";

const app = createApp(env);
const server = http.createServer(app);

connectRedis().catch(console.error);

export const io = new SocketIOServer(server, {
  cors: { origin: env.corsOrigin, credentials: true },
});

async function start() {
  try {
    if (!env.mongoUri) {
      throw new Error("Missing required MongoDB connection string (MONGO_URI)");
    }

    await mongoose.connect(env.mongoUri, {
      maxPoolSize: env.mongoPoolSize,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as mongoose.ConnectOptions);

    console.log(`[${process.pid}] ✅ Connected to MongoDB: Main`);

    connectRabbitMQ().catch(console.error);

    server.listen(env.port, () => {
      console.log(`[${process.pid}] 🚀 Server running on port ${env.port}`);
    });
  } catch (err) {
    console.error(`[${process.pid}] ❌ Server startup failed:`, err);
    process.exitCode = 1;
  }
}

start();

io.on("connection", (socket) => {
  console.log("🔌 New client connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});
