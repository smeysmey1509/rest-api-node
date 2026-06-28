import "../../../packages/shared/src/register-paths";

import app from "./app";
import { env } from "@shared/config/env";
import { startService } from "@shared/http/start-service";

startService({
  app,
  serviceName: "inventory-service",
  port: env.ports.inventory,
  mongoUriEnv: "INVENTORY_MONGO_URI",
}).catch((error: Error) => {
  console.error("[inventory-service] Startup failed:", error);
  process.exit(1);
});
