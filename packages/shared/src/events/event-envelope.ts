import { randomUUID } from "crypto";

export type EventEnvelope<TPayload = unknown> = {
  eventId: string;
  eventType: string;
  eventVersion: number;
  occurredAt: string;
  producer: string;
  correlationId: string;
  causationId?: string;
  aggregateType: string;
  aggregateId: string;
  payload: TPayload;
};

export type BuildEventEnvelope<TPayload> = Omit<
  EventEnvelope<TPayload>,
  "eventId" | "occurredAt" | "eventVersion"
> & {
  eventId?: string;
  occurredAt?: string;
  eventVersion?: number;
};

export const buildEventEnvelope = <TPayload>({
  eventId = randomUUID(),
  occurredAt = new Date().toISOString(),
  eventVersion = 1,
  ...event
}: BuildEventEnvelope<TPayload>): EventEnvelope<TPayload> => ({
  eventId,
  occurredAt,
  eventVersion,
  ...event,
});

