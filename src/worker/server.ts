import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import activityRoutes from "./routes/activity";
import cors from "cors";
import { consumeActivityLogs } from "./queue/activityConsumer";


const app = express();
const PORT = 5003;

app.use(express.json());
app.use(cookieParser());
app.use(  cors({
    origin: "http://localhost:5173",
    credentials: true,
}));

app.use("/api/v1", activityRoutes)

const startServer = async () => {
    try {
        await mongoose.connect("mongodb+srv://dbSmey:123@cluster0.dgk3xwx.mongodb.net/");
        console.log("✅ MongoDB connected");

        // Start consuming RabbitMQ
        await consumeActivityLogs();

        app.listen(PORT, () => {
            console.log(`🚀 Worker service running on port ${PORT}`);
        });
    } catch (err) {
        console.error("❌ MongoDB connection failed:", err);
        process.exit(1);
    }
};

startServer();