import mongoose, { InferSchemaType, Model } from "mongoose";

export const OutboxStatus = {
  Pending: "PENDING",
  Publishing: "PUBLISHING",
  Published: "PUBLISHED",
  Failed: "FAILED",
} as const;

const OutboxEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, immutable: true },
    eventType: { type: String, required: true, immutable: true, index: true },
    eventVersion: { type: Number, required: true, immutable: true, min: 1 },
    occurredAt: { type: Date, required: true, immutable: true },
    producer: { type: String, required: true, immutable: true },
    correlationId: { type: String, required: true, immutable: true },
    causationId: { type: String, immutable: true },
    aggregateType: { type: String, required: true, immutable: true },
    aggregateId: { type: String, required: true, immutable: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true, immutable: true },
    status: {
      type: String,
      enum: Object.values(OutboxStatus),
      default: OutboxStatus.Pending,
      required: true,
    },
    attempts: { type: Number, required: true, min: 0, default: 0 },
    nextAttemptAt: { type: Date, required: true, default: Date.now },
    publishedAt: Date,
    lastError: String,
    claimedAt: Date,
    claimedBy: String,
  },
  { timestamps: true, collection: "outbox_events", versionKey: false },
);

OutboxEventSchema.index({ status: 1, nextAttemptAt: 1, createdAt: 1 });
OutboxEventSchema.index({ aggregateType: 1, aggregateId: 1, createdAt: 1 });

export type OutboxEvent = InferSchemaType<typeof OutboxEventSchema>;
export const OutboxEventModel = (mongoose.models.OutboxEvent as Model<OutboxEvent>) ||
  mongoose.model<OutboxEvent>("OutboxEvent", OutboxEventSchema);

