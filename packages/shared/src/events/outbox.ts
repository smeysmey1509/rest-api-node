import { ClientSession } from "mongoose";
import { EventEnvelope } from "./event-envelope";
import { OutboxEventModel, OutboxStatus } from "./outbox.model";

export const enqueueOutboxEvent = async (
  event: EventEnvelope,
  session: ClientSession,
): Promise<void> => {
  await OutboxEventModel.create(
    [{ ...event, occurredAt: new Date(event.occurredAt), status: OutboxStatus.Pending }],
    { session },
  );
};

