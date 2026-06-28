import mongoose, { Document, Model, Schema, Types } from "mongoose";
import { InventoryUnitCondition, InventoryUnitStatus } from "./inventory-unit.types";

export interface IInventoryPurchase {
  supplierId?: Types.ObjectId;
  purchaseOrderId?: Types.ObjectId | string;
  costPrice?: number;
  currency?: string;
  receivedAt?: Date;
}

export interface IInventoryWarranty {
  warrantyMonths?: number;
  warrantyStartAt?: Date;
  warrantyEndAt?: Date;
}

export interface IInventorySold {
  orderId?: Types.ObjectId | string;
  orderItemId?: Types.ObjectId | string;
  soldAt?: Date;
  soldPrice?: number;
}

export interface IInventoryUnit extends Document {
  productId: Types.ObjectId;
  variantId: Types.ObjectId;
  locationId: Types.ObjectId;
  serialNumber?: string;
  imei1?: string;
  imei2?: string;
  status: InventoryUnitStatus;
  condition: InventoryUnitCondition;
  purchase?: IInventoryPurchase;
  warranty?: IInventoryWarranty;
  reservedBy?: Types.ObjectId;
  reservedUntil?: Date;
  sold?: IInventorySold;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseSchema = new Schema<IInventoryPurchase>(
  {
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier" },
    purchaseOrderId: { type: Schema.Types.Mixed },
    costPrice: { type: Number, min: 0 },
    currency: { type: String, uppercase: true, default: "USD" },
    receivedAt: { type: Date },
  },
  { _id: false }
);

const WarrantySchema = new Schema<IInventoryWarranty>(
  {
    warrantyMonths: { type: Number, min: 0 },
    warrantyStartAt: { type: Date },
    warrantyEndAt: { type: Date },
  },
  { _id: false }
);

const SoldSchema = new Schema<IInventorySold>(
  {
    orderId: { type: Schema.Types.Mixed },
    orderItemId: { type: Schema.Types.Mixed },
    soldAt: { type: Date },
    soldPrice: { type: Number, min: 0 },
  },
  { _id: false }
);

const InventoryUnitSchema = new Schema<IInventoryUnit>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: Schema.Types.ObjectId, ref: "ProductVariant", required: true },
    locationId: { type: Schema.Types.ObjectId, ref: "StockLocation", required: true },
    serialNumber: { type: String, trim: true },
    imei1: { type: String, trim: true },
    imei2: { type: String, trim: true },
    status: {
      type: String,
      enum: ["AVAILABLE", "RESERVED", "SOLD", "RETURNED", "DAMAGED", "REPAIR", "LOST", "TRANSFERRED"],
      default: "AVAILABLE",
    },
    condition: {
      type: String,
      enum: ["NEW", "USED", "REFURBISHED", "OPEN_BOX"],
      default: "NEW",
    },
    purchase: { type: PurchaseSchema, default: undefined },
    warranty: { type: WarrantySchema, default: undefined },
    reservedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reservedUntil: { type: Date },
    sold: { type: SoldSchema, default: undefined },
  },
  { timestamps: true, versionKey: false }
);

InventoryUnitSchema.pre("validate", function (next) {
  if (this.serialNumber) this.serialNumber = String(this.serialNumber).trim();
  if (this.imei1) this.imei1 = String(this.imei1).trim();
  if (this.imei2) this.imei2 = String(this.imei2).trim();
  if (this.purchase?.currency) this.purchase.currency = String(this.purchase.currency).toUpperCase();
  next();
});

InventoryUnitSchema.index({ serialNumber: 1 }, { unique: true, sparse: true });
InventoryUnitSchema.index({ imei1: 1 }, { unique: true, sparse: true });
InventoryUnitSchema.index({ imei2: 1 }, { unique: true, sparse: true });
InventoryUnitSchema.index({ productId: 1 });
InventoryUnitSchema.index({ variantId: 1 });
InventoryUnitSchema.index({ locationId: 1 });
InventoryUnitSchema.index({ status: 1 });
InventoryUnitSchema.index({ variantId: 1, status: 1 });
InventoryUnitSchema.index({ locationId: 1, status: 1 });
InventoryUnitSchema.index({ reservedUntil: 1, status: 1 });

const InventoryUnit: Model<IInventoryUnit> =
  mongoose.models.InventoryUnit || mongoose.model<IInventoryUnit>("InventoryUnit", InventoryUnitSchema);

export default InventoryUnit;
