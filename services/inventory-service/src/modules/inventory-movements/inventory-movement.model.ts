import mongoose, { Document, Model, Schema, Types } from "mongoose";
import { InventoryMovementType, InventoryReferenceType } from "./inventory-movement.types";

export interface IInventoryMovement extends Document {
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
  inventoryUnitId?: Types.ObjectId;
  type: InventoryMovementType;
  fromLocationId?: Types.ObjectId;
  toLocationId?: Types.ObjectId;
  quantity: number;
  serialNumber?: string;
  imei1?: string;
  referenceType: InventoryReferenceType;
  referenceId?: Types.ObjectId | string;
  note?: string;
  createdBy?: Types.ObjectId;
  createdAt: Date;
}

const InventoryMovementSchema = new Schema<IInventoryMovement>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    variantId: { type: Schema.Types.ObjectId, ref: "ProductVariant", required: true, index: true },
    inventoryUnitId: { type: Schema.Types.ObjectId, ref: "InventoryUnit", index: true },
    type: {
      type: String,
      enum: [
        "STOCK_IN",
        "STOCK_OUT",
        "RESERVED",
        "RESERVATION_RELEASED",
        "SOLD",
        "RETURNED",
        "TRANSFERRED",
        "ADJUSTED",
        "DAMAGED",
        "REPAIR",
      ],
      required: true,
      index: true,
    },
    fromLocationId: { type: Schema.Types.ObjectId, ref: "StockLocation", index: true },
    toLocationId: { type: Schema.Types.ObjectId, ref: "StockLocation", index: true },
    quantity: { type: Number, required: true, min: 1 },
    serialNumber: { type: String, trim: true },
    imei1: { type: String, trim: true },
    referenceType: {
      type: String,
      enum: ["PURCHASE_ORDER", "ORDER", "RETURN", "TRANSFER", "MANUAL_ADJUSTMENT", "SYSTEM"],
      default: "SYSTEM",
      index: true,
    },
    referenceId: { type: Schema.Types.Mixed },
    note: { type: String, trim: true, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

InventoryMovementSchema.index({ inventoryUnitId: 1, createdAt: -1 });
InventoryMovementSchema.index({ variantId: 1, createdAt: -1 });
InventoryMovementSchema.index({ productId: 1, createdAt: -1 });
InventoryMovementSchema.index({ referenceType: 1, referenceId: 1 });

const InventoryMovement: Model<IInventoryMovement> =
  mongoose.models.InventoryMovement ||
  mongoose.model<IInventoryMovement>("InventoryMovement", InventoryMovementSchema);

export default InventoryMovement;
