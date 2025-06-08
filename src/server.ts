import express from "express";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import userRoutes from "./routes/user";
import productRoutes from "./routes/product";
import categoryRoutes from "./routes/category";
import roleRoutes from "./routes/role";
import cors from "cors";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(  cors({
    origin: "http://localhost:5173",
    credentials: true,
}));

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
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as mongoose.ConnectOptions
  )
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(process.env.PORT || 5002, () => {
      console.log(`Server is running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch((err: Error) => {
    console.error("Error connecting to MongoDB:", err);
  });
