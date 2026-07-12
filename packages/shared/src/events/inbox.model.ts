import mongoose, { InferSchemaType, Model } from "mongoose";

export const InboxStatus = {
  Processing: "PROCESSING",
  Processed: "PROCESSED",
  Failed: "FAILED",
} as const;

const InboxEventSchema = new mongoose.Schema(
  {
    consumerName: { type: String, required: true, immutable: true },
    eventId: { type: String, required: true, immutable: true },
    receivedAt: { type: Date, required: true, default: Date.now, immutable: true },
    processedAt: Date,
    status: { type: String, enum: Object.values(InboxStatus), required: true },
    attempts: { type: Number, required: true, min: 1, default: 1 },
    lastError: String,
  },
  { timestamps: true, collection: "inbox_events", versionKey: false },
);

InboxEventSchema.index({ consumerName: 1, eventId: 1 }, { unique: true });
InboxEventSchema.index({ consumerName: 1, status: 1, updatedAt: 1 });

export type InboxEvent = InferSchemaType<typeof InboxEventSchema>;
export const InboxEventModel = (mongoose.models.InboxEvent as Model<InboxEvent>) ||
  mongoose.model<InboxEvent>("InboxEvent", InboxEventSchema);

