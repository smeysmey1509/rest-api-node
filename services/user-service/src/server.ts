import "../../../packages/shared/src/register-paths";

import app from "./app";
import { env } from "@shared/config/env";
import { startService } from "@shared/http/start-service";

startService({
  app,
  serviceName: "user-service",
  port: env.ports.user,
  mongoUriEnv: "USER_MONGO_URI",
}).catch((error: Error) => {
  console.error("[user-service] Startup failed:", error);
  process.exit(1);
});
