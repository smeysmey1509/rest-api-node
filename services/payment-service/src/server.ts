import "../../../packages/shared/src/register-paths";

import app from "./app";
import { env } from "@shared/config/env";
import { startService } from "@shared/http/start-service";

startService({
  app,
  serviceName: "payment-service",
  port: env.ports.payment,
  mongoUriEnv: "PAYMENT_MONGO_URI",
}).catch((error: Error) => {
  console.error("[payment-service] Startup failed:", error);
  process.exit(1);
});
