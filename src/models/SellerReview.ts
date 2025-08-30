// models/SellerReview.ts
import { Schema, model, Types, Document } from "mongoose";

export interface ISellerReview extends Document {
  seller: Types.ObjectId;
  user: Types.ObjectId;
  orderId: Types.ObjectId;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SellerReviewSchema = new Schema<ISellerReview>({
  seller: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  user:   { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  orderId:{ type: Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment:{ type: String, trim: true, maxlength: 5000 },
}, { timestamps: true });

SellerReviewSchema.index({ seller: 1, user: 1 }, { unique: true });

export default model<ISellerReview>("SellerReview", SellerReviewSchema);
