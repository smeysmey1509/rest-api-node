import "../../../packages/shared/src/register-paths";

import app from "./app";
import { env } from "@shared/config/env";
import { startService } from "@shared/http/start-service";

startService({
  app,
  serviceName: "auth-service",
  port: env.ports.auth,
  mongoUriEnv: "AUTH_MONGO_URI",
}).catch((error: Error) => {
  console.error("[auth-service] Startup failed:", error);
  process.exit(1);
});
