import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import cors from "cors";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

// Routes
app.use("/api/v1", authRoutes);

console.log("Hello Konkon")

// Connect to DB
mongoose
  .connect(
    process.env.MONGO_URI as string,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as mongoose.ConnectOptions
  )
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(process.env.PORT || 5000, () => {
      console.log(`Server is running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch((err: Error) => {
    console.error("Error connecting to MongoDB:", err);
  });
