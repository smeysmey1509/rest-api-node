import mongoose, { InferSchemaType, Model } from "mongoose";

const PurchaseOrderItemSchema = new mongoose.Schema(
  {
    variantId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "ProductVariant" },
    orderedQuantity: { type: Number, required: true, min: 1 },
    receivedQuantity: { type: Number, required: true, min: 0, default: 0 },
    unitCost: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, uppercase: true, trim: true, minlength: 3, maxlength: 3 },
    expectedSerials: [{ type: String, trim: true }],
  },
  { _id: true },
);

const PurchaseOrderSchema = new mongoose.Schema(
  {
    purchaseOrderNumber: { type: String, required: true, unique: true, immutable: true, uppercase: true, trim: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Supplier", immutable: true },
    locationId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "StockLocation", immutable: true },
    items: { type: [PurchaseOrderItemSchema], required: true },
    status: {
      type: String,
      enum: ["DRAFT", "SUBMITTED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"],
      default: "DRAFT",
      required: true,
    },
    orderedAt: Date,
    receivedAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User", immutable: true },
  },
  { timestamps: true, collection: "purchase_orders" },
);
PurchaseOrderSchema.index({ supplierId: 1, status: 1, createdAt: -1 });

export type PurchaseOrder = InferSchemaType<typeof PurchaseOrderSchema>;
export const PurchaseOrderModel = (mongoose.models.PurchaseOrder as Model<PurchaseOrder>) ||
  mongoose.model<PurchaseOrder>("PurchaseOrder", PurchaseOrderSchema);

