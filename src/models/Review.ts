import mongoose, { Schema, Types, Model, Document } from "mongoose";

export interface IReview extends Document {
  product: Types.ObjectId;
  user: Types.ObjectId;
  rating: number;
  title?: string;
  body?: string;
}

const ReviewSchema = new Schema<IReview>({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
  user:    { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  rating:  { type: Number, min: 1, max: 5, required: true },
  title:   { type: String, trim: true },
  body:    { type: String, trim: true, maxlength: 2000 },
}, { timestamps: true });

ReviewSchema.index({ product: 1, user: 1 }, { unique: true }); // one review per user per product

const Review: Model<IReview> = mongoose.models.Review || mongoose.model("Review", ReviewSchema);
export default Review;
