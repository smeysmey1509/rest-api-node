// models/Product.ts
import mongoose, { Document, Schema, Model, Types } from "mongoose";

export type PublishStatus = "Published" | "Unpublished";

export interface IProduct extends Document {
  // core
  name: string;
  slug: string;                          // SEO-friendly id
  description?: string;

  // merchandising
  brand?: string;                        // card subtitle ("Stealth Series")
  price: number;
  compareAtPrice?: number;               // show strike-through & % Off
  currency?: string;

  // inventory
  stock: number;

  // relations
  category: Types.ObjectId;
  seller: Types.ObjectId;

  // status & tags
  status: PublishStatus;
  tag: string[];

  // images (backward compatible)
  images: string[];
  primaryImageIndex: number;

  // analytics for card & sort/filter
  ratingAvg: number;                     // 0..5
  ratingCount: number;                   // e.g. 874
  salesCount: number;                    // popularity
  isTrending?: boolean;                  // optional flag you can set from metrics jobs

  // virtuals
  primaryImage?: string | null;
  discountPercent?: number;

  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema<IProduct> = new Schema(
  {
    // core
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, index: true }, // unique can be added after backfill
    description: { type: String, default: "" },

    // merchandising
    brand: { type: String, trim: true, index: true },
    price: { type: Number, required: true, min: 0, index: true },
    compareAtPrice: { type: Number, min: 0 },
    currency: { type: String, default: "USD" },

    // inventory
    stock: { type: Number, required: true, default: 0, min: 0 },

    // relations
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", index: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },

    // status & tags
    status: { type: String, enum: ["Published", "Unpublished"], default: "Published", index: true },
    tag: { type: [String], default: [], index: true },

    // images (compatible with your existing docs)
    images: { type: [String], default: [] },
    primaryImageIndex: { type: Number, default: 0 },

    // analytics
    ratingAvg: { type: Number, default: 0, min: 0, max: 5, index: true },
    ratingCount: { type: Number, default: 0, min: 0 },
    salesCount: { type: Number, default: 0, min: 0, index: true },
    isTrending: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Hygiene / defaults ---
ProductSchema.pre("save", function (next) {
  // images / primary index
  if (!Array.isArray(this.images)) this.images = [];
  if (this.images.length === 0) this.primaryImageIndex = 0;
  if (this.primaryImageIndex < 0 || this.primaryImageIndex >= this.images.length) {
    this.primaryImageIndex = 0;
  }

  // normalize tags
  if (Array.isArray(this.tag)) {
    const clean = Array.from(new Set(this.tag.map((t) => String(t).trim()).filter(Boolean)));
    this.tag = clean;
  }

  // slug (idempotent if already present)
  if (!this.slug) {
    const base = String(this.name || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    const suffix = (this._id?.toString() ?? Date.now().toString()).slice(-6);
    this.slug = `${base}-${suffix}`;
  }

  next();
});

// --- Virtuals used by the card ---
ProductSchema.virtual("primaryImage").get(function (this: IProduct) {
  if (!this.images?.length) return null;
  const idx = Number.isInteger(this.primaryImageIndex) ? this.primaryImageIndex : 0;
  return this.images[idx] ?? this.images[0];
});

ProductSchema.virtual("discountPercent").get(function (this: IProduct) {
  if (!this.compareAtPrice || this.compareAtPrice <= this.price) return 0;
  return Math.round(((this.compareAtPrice - this.price) / this.compareAtPrice) * 100);
});

// --- Indexes for search/list/filters ---
ProductSchema.index({ status: 1, category: 1, price: 1 });
ProductSchema.index({ brand: 1, price: 1 });
ProductSchema.index({ salesCount: -1, ratingCount: -1, ratingAvg: -1 });
ProductSchema.index({ name: "text", tag: "text" });

const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
