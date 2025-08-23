// models/DeliverySetting.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IDeliverySetting extends Document {
  method: string;
  baseFee: number;
  freeThreshold?: number;
  estimatedDays: number;
  isActive: boolean;
  code?: string;
}

const DeliverySettingSchema = new Schema<IDeliverySetting>(
  {
    method: { type: String, required: true, unique: true, default: "standard" },
    baseFee: { type: Number, required: true },
    freeThreshold: { type: Number },
    estimatedDays: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    code: { type: String, default: null, unique: true },
  },
  { timestamps: true }
);

export default mongoose.model<IDeliverySetting>(
  "DeliverySetting",
  DeliverySettingSchema
);
