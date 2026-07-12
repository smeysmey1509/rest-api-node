import { randomUUID } from "crypto";
import { publishToQueue } from "../infrastructure/rabbitmq/rabbitmq.client";
import { OutboxEventModel, OutboxStatus } from "./outbox.model";

const workerId = `${process.pid}-${randomUUID()}`;

export const publishNextOutboxEvent = async (now = new Date()): Promise<boolean> => {
  const event = await OutboxEventModel.findOneAndUpdate(
    { status: { $in: [OutboxStatus.Pending, OutboxStatus.Failed] }, nextAttemptAt: { $lte: now } },
    {
      $set: { status: OutboxStatus.Publishing, claimedAt: now, claimedBy: workerId },
      $inc: { attempts: 1 },
    },
    { new: true, sort: { createdAt: 1 } },
  ).lean();
  if (!event) return false;

  try {
    const published = await publishToQueue(event.eventType, {
      eventId: event.eventId,
      eventType: event.eventType,
      eventVersion: event.eventVersion,
      occurredAt: event.occurredAt.toISOString(),
      producer: event.producer,
      correlationId: event.correlationId,
      causationId: event.causationId,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      payload: event.payload,
    });
    if (!published) throw new Error("RabbitMQ channel is unavailable.");
    await OutboxEventModel.updateOne(
      { _id: event._id, status: OutboxStatus.Publishing, claimedBy: workerId },
      { $set: { status: OutboxStatus.Published, publishedAt: new Date() }, $unset: { claimedAt: 1, claimedBy: 1, lastError: 1 } },
    );
  } catch (error) {
    const delayMs = Math.min(300_000, 1_000 * 2 ** Math.min(event.attempts, 8));
    await OutboxEventModel.updateOne(
      { _id: event._id, status: OutboxStatus.Publishing, claimedBy: workerId },
      {
        $set: {
          status: OutboxStatus.Failed,
          lastError: error instanceof Error ? error.message.slice(0, 1000) : "Unknown publish failure",
          nextAttemptAt: new Date(Date.now() + delayMs),
        },
        $unset: { claimedAt: 1, claimedBy: 1 },
      },
    );
  }
  return true;
};

