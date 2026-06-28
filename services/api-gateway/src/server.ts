import "../../../packages/shared/src/register-paths";

import http from "http";
import app from "./app";
import { env } from "@shared/config/env";
import { createLogger } from "@shared/utils/logger";

const logger = createLogger("api-gateway");
const port = env.ports.gateway;
const server = http.createServer(app);

server.listen(port, () => {
  logger.info(`Listening on port ${port}`);
});
