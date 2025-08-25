import mongoose, { Document, Schema, Model } from "mongoose";

export interface IProduct extends Document {
  name: string;
  description?: string;
  price: number;
  stock: number;
  category: mongoose.Types.ObjectId;
  seller: mongoose.Types.ObjectId;
  status: "Published" | "Unpublished";
  tag: string[];

  // ✅ New image model
  images: string[];              // all images
  primaryImageIndex: number;     // which one is primary (index into images[])
  primaryImage?: string | null;  // virtual (computed)

  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema<IProduct> = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, default: 0, min: 0 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: ["Published", "Unpublished"], default: "Published" },
    tag: { type: [String], default: [] },

    // 🔁 Replace `image: [String]` with:
    images: { type: [String], default: [] },
    primaryImageIndex: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, versionKey: false, transform: (_doc, ret) => {

      if (!Array.isArray(ret.images)) ret.images = [];
      if (ret.primaryImageIndex < 0 || ret.primaryImageIndex >= ret.images.length) {
        ret.primaryImageIndex = 0;
      }
      ret.primaryImage = ret.images.length ? ret.images[ret.primaryImageIndex] : null;

      // Back-compat: if someone still expects `image`, return the primary there too (remove if not needed)
      ret.image = ret.images; // or: ret.image = ret.primaryImage;

      return ret;
    }},
  }
);

// Keep index sane on save
ProductSchema.pre("save", function (next) {
  if (!Array.isArray(this.images)) this.images = [];
  if (this.images.length === 0) this.primaryImageIndex = 0;
  if (this.primaryImageIndex < 0 || this.primaryImageIndex >= this.images.length) {
    this.primaryImageIndex = 0;
  }
  next();
});

// Easy access to primary
ProductSchema.virtual("primaryImage").get(function (this: IProduct) {
  if (!this.images?.length) return null;
  const idx = Number.isInteger(this.primaryImageIndex) ? this.primaryImageIndex : 0;
  return this.images[idx] ?? this.images[0];
});

ProductSchema.index({ name: "text", tag: "text" });

const Product: Model<IProduct> = mongoose.model<IProduct>("Product", ProductSchema);
export default Product;
