import "../../../packages/shared/src/register-paths";

import http from "http";
import app from "./app";
import { createLogger } from "@shared/utils/logger";

const logger = createLogger("api-gateway");
const port = Number(process.env.PORT || 5002);
const server = http.createServer(app);

server.listen(port, () => {
  logger.info(`Listening on port ${port}`);
});
