import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPromoUsage extends Document {
  user: Types.ObjectId;
  promoCode: Types.ObjectId;
  usageCount: number;
}

const PromoUsageSchema: Schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  promoCode: { type: Schema.Types.ObjectId, ref: "PromoCode", required: true },
  usageCount: { type: Number, default: 0 },
});

export default mongoose.model<IPromoUsage>("PromoUsage", PromoUsageSchema);
