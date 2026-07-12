import mongoose, { InferSchemaType, Model } from "mongoose";

export const InventoryReservationStatuses = ["ACTIVE", "CONSUMED", "RELEASED", "EXPIRED"] as const;

const ReservationItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
    locationId: { type: mongoose.Schema.Types.ObjectId, required: true },
    quantity: { type: Number, required: true, min: 1 },
    inventoryUnitIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "InventoryUnit" }],
    trackingType: { type: String, enum: ["SERIAL", "BATCH", "NONE"], required: true },
  },
  { _id: false },
);

const InventoryReservationSchema = new mongoose.Schema(
  {
    reservationNumber: { type: String, required: true, unique: true, immutable: true, uppercase: true, trim: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User", index: true },
    items: { type: [ReservationItemSchema], required: true },
    status: { type: String, enum: InventoryReservationStatuses, default: "ACTIVE", required: true },
    expiresAt: { type: Date, required: true },
    consumedAt: Date,
    releasedAt: Date,
    claimedAt: Date,
    claimedBy: String,
  },
  { timestamps: true, collection: "inventory_reservations" },
);
InventoryReservationSchema.index({ status: 1, expiresAt: 1 });

export type InventoryReservation = InferSchemaType<typeof InventoryReservationSchema>;
export const InventoryReservationModel =
  (mongoose.models.InventoryReservation as Model<InventoryReservation>) ||
  mongoose.model<InventoryReservation>("InventoryReservation", InventoryReservationSchema);

