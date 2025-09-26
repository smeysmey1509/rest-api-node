// src/main/models/Brand.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IBrand extends Document {
  name: string;
  slug: string;
  isActive: boolean;
  productCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const BrandSchema = new Schema<IBrand>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

BrandSchema.virtual("productCount", {
  ref: "Product",
  localField: "_id",
  foreignField: "brand",
  count: true,
});

BrandSchema.index({ name: 1 }, { unique: true });
BrandSchema.index({ slug: 1 }, { unique: true });

export default mongoose.model<IBrand>("Brand", BrandSchema);
