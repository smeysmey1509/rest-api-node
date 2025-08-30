// models/Review.ts
import { Schema, model, Types, Document } from "mongoose";

export interface IReview extends Document {
  product: Types.ObjectId;
  user: Types.ObjectId;
  orderItem?: Types.ObjectId;
  rating: number;
  title?: string;
  comment?: string;
  photos?: string[];
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  reportedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  user:    { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  orderItem: { type: Schema.Types.ObjectId, ref: "OrderItem" },
  rating:  { type: Number, required: true, min: 1, max: 5 },
  title:   { type: String, trim: true, maxlength: 140 },
  comment: { type: String, trim: true, maxlength: 10000 },
  photos:  { type: [String], default: [] },
  isVerifiedPurchase: { type: Boolean, default: false },
  helpfulCount: { type: Number, default: 0 },
  reportedCount: { type: Number, default: 0 },
}, { timestamps: true });

// 1 review per (user, product). If you allow updates, this is perfect.
ReviewSchema.index({ product: 1, user: 1 }, { unique: true });

// (Optional) speed up store pages: star histograms
ReviewSchema.index({ product: 1, rating: 1 });

export default model<IReview>("Review", ReviewSchema);
