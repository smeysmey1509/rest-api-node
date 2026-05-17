import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPromoCode extends Document {
  _id: Types.ObjectId;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  expiresAt: Date;
  isActive: boolean;
  maxUsesPerUser: number;
}

const promoCodeSchema = new Schema<IPromoCode>({
  code: { type: String, required: true, unique: true, uppercase: true },
  discountType: { type: String, enum: ["percentage", "fixed"], required: true },
  discountValue: { type: Number, required: true },
  expiresAt: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  maxUsesPerUser: { type: Number, required: true, default: 1 },
});

export default mongoose.model<IPromoCode>("PromoCode", promoCodeSchema);
