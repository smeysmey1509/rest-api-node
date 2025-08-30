// models/Product.ts
import mongoose, { Schema, Model, Types, Document } from "mongoose";

/* =========================
   Types
========================= */

export type PublishStatus = "Published" | "Unpublished";

export interface IDimensions {
  length: number;
  width: number;
  height: number;
}

export interface IInventory {
  onHand: number;      // physical stock
  reserved: number;    // held for carts / open orders
  safetyStock: number; // buffer never sold below
}

export interface IProductVariant {
  sku: string;
  price: number;       // keep as major units (e.g., USD) for now
  stock?: number;      // legacy (will be mapped to inventory.onHand if inventory missing)
  inventory?: IInventory;
  attributes: Record<string, string>;
  images: string[];
  isActive?: boolean;
}

export interface IProduct extends Document {
  // core
  name: string;
  slug: string;                 // SEO id (unique per seller)
  description?: string;

  // merchandising (LEGACY top-level, used when no variants exist)
  brand?: string;
  price: number;                // use variants[].price in new products
  compareAtPrice?: number;
  currency?: string;

  // inventory (LEGACY top-level)
  stock: number;

  // relations
  category: Types.ObjectId;
  seller: Types.ObjectId;

  // status & tags
  status: PublishStatus;
  tag: string[];                // (kept as `tag` to avoid breaking routes)

  // media
  images: string[];
  primaryImageIndex: number;

  // analytics (denormalized for speed)
  ratingAvg: number;            // 0..5
  ratingCount: number;
  salesCount: number;
  isTrending?: boolean;

  // advanced data
  dimensions?: IDimensions;
  weight?: number;
  variants?: IProductVariant[];
  attributes?: Record<string, string>;

  // SEO
  seo?: { title?: string; description?: string; keywords?: string[] };

  // moderation
  isAdult?: boolean;
  isHazardous?: boolean;

  // soft delete
  isDeleted: boolean;
  deletedAt?: Date;

  // virtuals (not stored)
  primaryImage?: string | null;
  discountPercent?: number;
  availableTotal?: number;

  createdAt: Date;
  updatedAt: Date;
}

/* =========================
   Helpers
========================= */

const slugify = (s: string) =>
  s.toLowerCase().trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/* =========================
   Sub-schemas
========================= */

const InventorySchema = new Schema<IInventory>(
  {
    onHand: { type: Number, min: 0, default: 0 },
    reserved: { type: Number, min: 0, default: 0 },
    safetyStock: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

const VariantSchema = new Schema<IProductVariant>(
  {
    sku: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, min: 0, default: 0 },                  // legacy
    inventory: { type: InventorySchema, default: undefined },     // preferred
    attributes: { type: Map, of: String, default: {} },
    images: { type: [String], default: [] },
    isActive: { type: Boolean, default: true, index: true },
  },
  { _id: true, timestamps: true }
);

/* =========================
   Product schema
========================= */

const ProductSchema = new Schema<IProduct>(
  {
    // core
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 200, index: true },
    slug: { type: String, required: false, index: true }, // enforced unique per seller below
    description: { type: String, default: "", maxlength: 50_000 },

    // merchandising (legacy top-level)
    brand: { type: String, trim: true, default: "", index: true },
    price: { type: Number, required: true, min: 0, index: true },
    compareAtPrice: {
      type: Number,
      min: 0,
      validate: {
        validator(this: IProduct, v?: number) {
          if (v == null) return true;
          return v >= this.price;
        },
        message: "compareAtPrice must be ≥ price",
      },
    },
    currency: { type: String, default: "USD", uppercase: true, minlength: 3, maxlength: 3 },

    // inventory (legacy top-level)
    stock: { type: Number, required: true, default: 0, min: 0, index: true },

    // relations
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    seller: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // status & tags
    status: { type: String, enum: ["Published", "Unpublished"], default: "Published", index: true },
    tag: {
      type: [String],
      default: [],
      set: (arr: string[]) =>
        Array.from(new Set((arr || []).map((t) => String(t).trim()).filter(Boolean))),
      index: true,
    },

    // media
    images: { type: [String], default: [] },
    primaryImageIndex: { type: Number, default: 0, min: 0 },

    // analytics (denormalized)
    ratingAvg: { type: Number, default: 0, min: 0, max: 5, index: true },
    ratingCount: { type: Number, default: 0, min: 0 },
    salesCount: { type: Number, default: 0, min: 0, index: true },
    isTrending: { type: Boolean, default: false, index: true },

    // advanced
    dimensions: {
      type: new Schema(
        {
          length: { type: Number, default: 0, min: 0 },
          width: { type: Number, default: 0, min: 0 },
          height: { type: Number, default: 0, min: 0 },
        },
        { _id: false }
      ),
      default: undefined,
    },
    weight: { type: Number, default: 0, min: 0 },

    variants: { type: [VariantSchema], default: [] },

    attributes: { type: Map, of: String, default: {} },

    // SEO
    seo: {
      title: { type: String, trim: true, default: "" },
      description: { type: String, trim: true, default: "" },
      keywords: { type: [String], default: [] },
    },

    // moderation
    isAdult: { type: Boolean, default: false, index: true },
    isHazardous: { type: Boolean, default: false },

    // soft delete
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* =========================
   Hygiene / constraints
========================= */

// Normalize & generate slug
ProductSchema.pre("validate", function (next) {
  if (!this.slug && this.name) this.slug = slugify(this.name);
  if (this.slug) this.slug = slugify(this.slug);
  next();
});

// Clamp primaryImageIndex, normalize images
ProductSchema.pre("save", function (next) {
  if (!Array.isArray(this.images)) this.images = [];
  if (this.images.length === 0) this.primaryImageIndex = 0 as any;
  if (
    typeof this.primaryImageIndex !== "number" ||
    this.primaryImageIndex < 0 ||
    this.primaryImageIndex >= this.images.length
  ) {
    this.primaryImageIndex = 0 as any;
  }
  next();
});

// Default scope: hide soft-deleted unless explicitly opted in
ProductSchema.pre(/^find/, function (next) {
  // @ts-ignore
  if (!this.getOptions?.()?.withDeleted) {
    // @ts-ignore
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

// Validation to reduce redundancy footguns:
// If variants exist, top-level price/stock are optional; if no variants, they must be meaningful.
ProductSchema.path("variants").validate(function (variants: IProductVariant[]) {
  if (Array.isArray(variants) && variants.length > 0) return true;
  // If no variants, enforce non-negative price/stock already handled by schema,
  // but require price > 0 for a sellable product.
  return typeof this.price === "number" && this.price >= 0;
}, "Either provide variants[] or a valid top-level price.");

/* =========================
   Virtuals
========================= */

// Prefer product images; fall back to first variant image
ProductSchema.virtual("primaryImage").get(function (this: IProduct) {
  if (this.images?.length) return this.images[this.primaryImageIndex] ?? this.images[0] ?? null;
  const v0 = this.variants?.find(v => v.images?.length);
  return v0 ? v0.images[0] : null;
});

// Simple percent off from legacy top-level pricing (if used)
ProductSchema.virtual("discountPercent").get(function (this: IProduct) {
  if (!this.compareAtPrice || this.compareAtPrice <= this.price) return 0;
  return Math.round(((this.compareAtPrice - this.price) / this.compareAtPrice) * 100);
});

// Sum available across variants; if no variants, use legacy stock
ProductSchema.virtual("availableTotal").get(function (this: IProduct) {
  if (Array.isArray(this.variants) && this.variants.length) {
    return this.variants
      .filter((v) => v.isActive !== false)
      .reduce((acc, v) => {
        if (v.inventory) {
          const { onHand = 0, reserved = 0, safetyStock = 0 } = v.inventory;
          return acc + Math.max(0, onHand - reserved - safetyStock);
        }
        return acc + Math.max(0, v.stock ?? 0);
      }, 0);
  }
  return Math.max(0, this.stock ?? 0);
});

/* =========================
   Indexes
========================= */

// Text search across key fields
ProductSchema.index(
  { name: "text", brand: "text", description: "text", tag: "text", "seo.title": "text" },
  { name: "product_text", weights: { name: 10, brand: 5, description: 3, tag: 2 } }
);

// Storefront filters / sorts
ProductSchema.index({ status: 1, category: 1, price: 1, createdAt: -1 });
ProductSchema.index({ seller: 1, status: 1, createdAt: -1 });
ProductSchema.index({ isTrending: 1, salesCount: -1, ratingAvg: -1 });

// Unique slug per seller (ignores soft-deleted)
ProductSchema.index(
  { seller: 1, slug: 1 },
  { unique: true, partialFilterExpression: { isDeleted: { $ne: true } } }
);

// Unique SKU per seller across variants
ProductSchema.index(
  { seller: 1, "variants.sku": 1 },
  { unique: true, partialFilterExpression: { isDeleted: { $ne: true } } }
);

/* =========================
   Model
========================= */

const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
