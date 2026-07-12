import mongoose, { InferSchemaType, Model } from "mongoose";

const InventoryBalanceSchema = new mongoose.Schema(
  {
    variantId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "ProductVariant", immutable: true },
    locationId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "StockLocation", immutable: true },
    onHand: { type: Number, required: true, min: 0, default: 0 },
    reserved: { type: Number, required: true, min: 0, default: 0 },
    available: { type: Number, required: true, min: 0, default: 0 },
    safetyStock: { type: Number, required: true, min: 0, default: 0 },
    version: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true, collection: "inventory_balances", versionKey: false },
);

InventoryBalanceSchema.index({ variantId: 1, locationId: 1 }, { unique: true });
InventoryBalanceSchema.index({ variantId: 1, available: 1 });
InventoryBalanceSchema.pre("validate", function validateInvariant(next) {
  const expected = this.onHand - this.reserved - this.safetyStock;
  if (this.reserved > this.onHand || expected < 0 || this.available !== expected) {
    return next(new Error("Inventory balance invariant violated: available = onHand - reserved - safetyStock."));
  }
  next();
});

export type InventoryBalance = InferSchemaType<typeof InventoryBalanceSchema>;
export const InventoryBalanceModel = (mongoose.models.InventoryBalance as Model<InventoryBalance>) ||
  mongoose.model<InventoryBalance>("InventoryBalance", InventoryBalanceSchema);

