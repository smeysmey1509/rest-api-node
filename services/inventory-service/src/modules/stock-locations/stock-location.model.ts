import mongoose, { Document, Model, Schema } from "mongoose";
import { StockLocationType } from "./stock-location.types";

export interface IStockLocation extends Document {
  name: string;
  code: string;
  type: StockLocationType;
  address?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StockLocationSchema = new Schema<IStockLocation>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    type: { type: String, enum: ["WAREHOUSE", "STORE", "POS_BRANCH"], required: true, index: true },
    address: { type: String, default: "", trim: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false }
);

StockLocationSchema.pre("validate", function (next) {
  if (this.code) this.code = String(this.code).trim().toUpperCase();
  if (this.type) this.type = String(this.type).toUpperCase() as StockLocationType;
  next();
});

StockLocationSchema.index({ code: 1 }, { unique: true });
StockLocationSchema.index({ isActive: 1, type: 1 });

const StockLocation: Model<IStockLocation> =
  mongoose.models.StockLocation || mongoose.model<IStockLocation>("StockLocation", StockLocationSchema);

export default StockLocation;
