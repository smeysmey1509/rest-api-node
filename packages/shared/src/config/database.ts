import mongoose from "mongoose";
import { env } from "./env";

export const connectDatabase = async (mongoUri = env.mongoUri) => {
  if (!mongoUri) {
    throw new Error("MONGO_URI is not configured");
  }

  await mongoose.connect(mongoUri, {
    maxPoolSize: 100,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  } as mongoose.ConnectOptions);
};
