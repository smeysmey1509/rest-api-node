import dns from "node:dns";
import mongoose from "mongoose";
import { env } from "./env";

export const connectDatabase = async (mongoUri = env.mongoUri) => {
  if (!mongoUri) {
    throw new Error("MONGO_URI is not configured");
  }

  if (mongoUri.startsWith("mongodb+srv://") && env.dnsServers.length > 0) {
    dns.setServers(env.dnsServers);
  }

  await mongoose.connect(mongoUri, {
    maxPoolSize: 100,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  } as mongoose.ConnectOptions);
};
