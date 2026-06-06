import "../../../packages/shared/src/register-paths";

import app from "./app";
import { startService } from "@shared/http/start-service";

startService({
  app,
  serviceName: "user-service",
  port: Number(process.env.PORT || 5102),
  mongoUriEnv: "USER_MONGO_URI",
}).catch((error: Error) => {
  console.error("[user-service] Startup failed:", error);
  process.exit(1);
});
