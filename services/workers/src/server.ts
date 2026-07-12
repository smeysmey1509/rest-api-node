import "../../../packages/shared/src/register-paths";
import { connectDatabase } from "@shared/config/database";
import { connectRabbitMQ } from "@shared/infrastructure/rabbitmq/rabbitmq.client";
import { publishNextOutboxEvent } from "@shared/events/outbox.worker";
import { createLogger } from "@shared/utils/logger";

const logger = createLogger("workers");
let stopping = false;

const run = async () => {
  await connectDatabase();
  await connectRabbitMQ();
  logger.info("worker.ready", { operation: "outbox-publisher" });
  while (!stopping) {
    const processed = await publishNextOutboxEvent();
    if (!processed) await new Promise((resolve) => setTimeout(resolve, 500));
  }
};

process.on("SIGTERM", () => { stopping = true; });
process.on("SIGINT", () => { stopping = true; });

run().catch((error) => {
  logger.error("worker.failed", error);
  process.exitCode = 1;
});

