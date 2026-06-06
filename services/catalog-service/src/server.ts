import "../../../packages/shared/src/register-paths";

import app from "./app";
import { startService } from "@shared/http/start-service";

startService({
  app,
  serviceName: "catalog-service",
  port: Number(process.env.PORT || 5103),
  mongoUriEnv: "CATALOG_MONGO_URI",
}).catch((error: Error) => {
  console.error("[catalog-service] Startup failed:", error);
  process.exit(1);
});
