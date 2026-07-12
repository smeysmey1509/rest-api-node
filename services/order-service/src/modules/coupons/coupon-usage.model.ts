import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPromoUsage extends Document {
  user: Types.ObjectId;
  promoCode: Types.ObjectId;
  usageCount: number;
  reservedCount: number;
  consumedCount: number;
  releasedCount: number;
}

const PromoUsageSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  promoCode: { type: Schema.Types.ObjectId, ref: "PromoCode", required: true },
  usageCount: { type: Number, default: 0 },
  reservedCount: { type: Number, min: 0, default: 0 },
  consumedCount: { type: Number, min: 0, default: 0 },
  releasedCount: { type: Number, min: 0, default: 0 },
}, { timestamps: true, collection: "coupon_usages" });

PromoUsageSchema.index({ user: 1, promoCode: 1 }, { unique: true });

export default mongoose.model<IPromoUsage>("PromoUsage", PromoUsageSchema);
