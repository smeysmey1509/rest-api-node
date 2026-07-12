import mongoose, { Schema, Types, Model, Document } from "mongoose";

export interface IReview extends Document {
  product: Types.ObjectId;
  user: Types.ObjectId;
  rating: number;
  title?: string;
  body?: string;
  comment?: string;
  orderId?: Types.ObjectId;
  orderItemId?: string;
  isVerifiedPurchase?: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

const ReviewSchema = new Schema<IReview>({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  user:    { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  rating:  { type: Number, min: 1, max: 5, required: true },
  title:   { type: String, trim: true },
  body:    { type: String, trim: true, maxlength: 2000 },
  comment: { type: String, trim: true, maxlength: 2000 },
  orderId: { type: Schema.Types.ObjectId, ref: "Order" },
  orderItemId: { type: String, trim: true },
  isVerifiedPurchase: { type: Boolean, default: false },
  status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING", index: true },
}, { timestamps: true });

ReviewSchema.index({ product: 1, user: 1 }, { unique: true }); // one review per user per product
ReviewSchema.index({ orderId: 1, orderItemId: 1 }, { sparse: true });

const Review: Model<IReview> = mongoose.models.Review || mongoose.model("Review", ReviewSchema);
export default Review;
