import "./register-paths";

import http from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "@/app";
import { connectDatabase } from "@/config/database";
import { env } from "@/config/env";
import { connectRedis } from "@/infrastructure/redis/cache";
import { connectRabbitMQ } from "@/infrastructure/rabbitmq/rabbitmq.client";

const server = http.createServer(app);
export let io: SocketIOServer;

io = new SocketIOServer(server, {
  cors: {
    origin: env.corsOrigin,
    credentials: true,
  },
});

const bootstrap = async () => {
  await connectDatabase();
  console.log(`[${process.pid}] Connected to MongoDB`);

  await Promise.all([
    connectRedis().catch((error) => console.error("Redis connection skipped:", error)),
    connectRabbitMQ(),
  ]);

  server.listen(env.port, () => {
    console.log(`[${process.pid}] Server running on port ${env.port}`);
  });
};

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

bootstrap().catch((err: Error) => {
  console.error(`[${process.pid}] Server startup failed:`, err);
  process.exit(1);
});
