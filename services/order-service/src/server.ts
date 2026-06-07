import "../../../packages/shared/src/register-paths";

import app from "./app";
import { env } from "@shared/config/env";
import { startService } from "@shared/http/start-service";

startService({
  app,
  serviceName: "order-service",
  port: env.ports.order,
  mongoUriEnv: "ORDER_MONGO_URI",
}).catch((error: Error) => {
  console.error("[order-service] Startup failed:", error);
  process.exit(1);
});
