import { randomUUID } from "crypto";
import { publishToQueue } from "../infrastructure/rabbitmq/rabbitmq.client";
import { DomainEvent, DomainEventName, DomainEventPayloads } from "./domain-events";

export const buildDomainEvent = <TName extends DomainEventName>(
  name: TName,
  payload: DomainEventPayloads[TName],
): DomainEvent<TName> => ({
  id: randomUUID(),
  name,
  occurredAt: new Date().toISOString(),
  payload,
});

export const publishDomainEvent = async <TName extends DomainEventName>(
  name: TName,
  payload: DomainEventPayloads[TName],
) => {
  await publishToQueue(name, buildDomainEvent(name, payload));
};
