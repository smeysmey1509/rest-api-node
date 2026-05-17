import mongoose from "mongoose";
import { env } from "./env";

export const connectDatabase = async () => {
  if (!env.mongoUri) {
    throw new Error("MONGO_URI is not configured");
  }

  await mongoose.connect(env.mongoUri, {
    maxPoolSize: 100,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  } as mongoose.ConnectOptions);
};
