import express from "express";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import userRoutes from "./routes/user";
import productRoutes from "./routes/product";
import categoryRoutes from "./routes/category";
import roleRoutes from "./routes/role";
import cors from "cors";
import {connectRabbitMQ} from "./utils/rabbitmq";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(  cors({
    origin: "http://localhost:5173",
    credentials: true,
}));

// Log every incoming request with instance identifier
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] Instance PID: ${process.pid}, PM2 ID: ${process.env.pm2_id}, Path: ${req.path}`);
    next();
});

// Debug endpoint to identify instance
app.get('/debug', (req, res) => {
    res.json({
        instance: `PM2 ID: ${process.env.pm2_id || 'unknown'}`,
        pid: process.pid,
        port: process.env.PORT || 5002,
        timestamp: new Date().toISOString()
    });
});

// Prefix routes
app.use("/api/v1", userRoutes);
app.use("/api/v1", productRoutes);
app.use("/api/v1", categoryRoutes);
app.use("/api/v1", roleRoutes);

// Connect to DB
mongoose
  .connect(
    process.env.MONGO_URI as string,
    {
      maxPoolSize: 100,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as mongoose.ConnectOptions
  )
  .then(() => {
      console.log(`[${process.pid}] Connected to MongoDB`);
    app.listen(process.env.PORT || 5002, () => {
        console.log(`[${process.pid}] Server is running on port ${process.env.PORT || 5002}`);
    });
  })
  .catch((err: Error) => {
      console.error(`[${process.pid}] Error connecting to MongoDB:`, err);
  });

connectRabbitMQ().catch(console.error);