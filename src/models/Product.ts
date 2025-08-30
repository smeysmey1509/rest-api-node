// models/Product.ts
import mongoose, { Schema, Model, Types, Document } from "mongoose";

export type PublishStatus = "Published" | "Unpublished";

export interface IDimensions {
  length: number;
  width: number;
  height: number;
}

export interface IInventory {
  onHand: number;
  reserved: number;
  safetyStock: number;
}

export interface IProductVariant {
  sku: string;
  price: number;
  stock?: number;
  inventory?: IInventory;
  attributes: Record<string, string>;
  images: string[];
  isActive?: boolean;
}

export interface IProduct extends Document {
  // core
  productId: string;
  name: string;
  slug: string; // SEO id (unique per seller)
  description?: string;

  // merchandising (LEGACY top-level, used when no variants exist)
  brand?: string;
  price: number; // use variants[].price in new products
  compareAtPrice?: number;
  currency?: string;

  // inventory (LEGACY top-level)
  stock: number;

  // relations
  category: Types.ObjectId;
  seller: Types.ObjectId;

  // status & tags
  status: PublishStatus;
  tag: string[]; // (kept as `tag` to avoid breaking routes)

  // media
  images: string[];
  primaryImageIndex: number;

  // analytics (denormalized for speed)
  ratingAvg: number; // 0..5
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

  dedupeKey: string;

  createdAt: Date;
  updatedAt: Date;
};

function generateCustomId(prefix = "PRD"): string {
  // 3–4 pieces: prefix + base36 timestamp + 4-char random
  const ts = Date.now().toString(36).toUpperCase();      // e.g. "MBC123"
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${ts}-${rand}`;                       // e.g. "PRD-MBC123-8XQK"
}

const CUSTOM_ID_RE = /^[A-Z0-9][A-Z0-9._-]{2,31}$/; // 3..32 chars, A-Z 0-9 . _ -
function normalizeCustomId(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim().toUpperCase();
  return s.length ? s : undefined;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

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
    stock: { type: Number, min: 0, default: 0 }, // legacy
    inventory: { type: InventorySchema, default: undefined }, // preferred
    attributes: { type: Map, of: String, default: {} },
    images: { type: [String], default: [] },
    isActive: { type: Boolean, default: true, index: true },
  },
  { _id: true, timestamps: true }
);

const ProductSchema = new Schema<IProduct>(
  {
    // core
    productId: {
      type: String,
      trim: true,
      immutable: true,               // cannot change after create
      required: false,               // we’ll fill it in pre-validate if missing
      validate: {
        validator(v: string) {
          if (!v) return true;       // empty handled in pre-validate
          return CUSTOM_ID_RE.test(v);
        },
        message: "customId must be 3–32 chars, A–Z, 0–9, dot, underscore or dash (no spaces).",
      },
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 200,
      index: true,
    },
    slug: { type: String, required: false, index: true }, // enforced unique per seller below
    description: { type: String, default: "", maxlength: 50_000 },

    // merchandising (legacy top-level)
    brand: { type: String, trim: true, default: "", index: true },
    price: {
      type: Number,
      min: 0,
      index: true,
      required: function (this: IProduct) {
        return !(Array.isArray(this.variants) && this.variants.length > 0);
      },
    },
    compareAtPrice: {
      type: Number,
      min: 0,
      validate: {
        validator(this: IProduct, v?: number) {
          if (v == null) return true;           // optional
          const base = getEffectivePrice(this); // top-level or min variant
          if (typeof base !== "number") return true;
          return v >= base;
        },
        message: "compareAtPrice must be ≥ price",
      },
    },
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
      minlength: 3,
      maxlength: 3,
    },

    // inventory (legacy top-level)
    stock: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
      required: function (this: IProduct) {
        return !(Array.isArray(this.variants) && this.variants.length > 0);
      },
    },

    // relations
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // status & tags
    status: {
      type: String,
      enum: ["Published", "Unpublished"],
      default: "Published",
      index: true,
    },
    tag: {
      type: [String],
      default: [],
      set: (arr: string[]) =>
        Array.from(
          new Set((arr || []).map((t) => String(t).trim()).filter(Boolean))
        ),
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

    dedupeKey: { type: String, select: false, index: true },

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

// Build the dedupe key in the same way your controller does
function buildDedupeKey(doc: any) {
  const name = (doc.name || "").toString().trim().toLowerCase();
  const brand = (doc.brand || "").toString().trim().toLowerCase();
  const category = (doc.category ?? "").toString();
  return [name, brand, category].join("|");
}

// helper inside models/Product.ts (top of file or near helpers)
function getEffectivePrice(doc: any): number | undefined {
  if (typeof doc.price === "number") return doc.price;
  if (Array.isArray(doc.variants) && doc.variants.length) {
    const prices = doc.variants
      .filter((v: any) => v?.isActive !== false)
      .map((v: any) => Number(v.price))
      .filter((n: any) => Number.isFinite(n));
    if (prices.length) return Math.min(...prices);
  }
  return undefined;
}

// Normalize & generate slug
ProductSchema.pre("validate", function (next) {
  // existing slug logic...
  if (!this.slug && this.name) this.slug = slugify(this.name);
  if (this.slug) this.slug = slugify(this.slug);

  // normalize incoming productId to UPPER
  if (this.productId) this.productId = normalizeCustomId(this.productId)!;

  // if none provided, auto-generate
  if (!this.productId) {
    // you can pass brand prefix if you like:
    const prefix = this.brand ? String(this.brand).replace(/[^A-Za-z0-9]/g, "").slice(0,3).toUpperCase() : "PRD";
    this.productId = generateCustomId(prefix);
  }

  // (keep your other pre-validate code, e.g., dedupeKey build if you use it)
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

// Prefer product images; fall back to first variant image
ProductSchema.virtual("primaryImage").get(function (this: IProduct) {
  if (this.images?.length)
    return this.images[this.primaryImageIndex] ?? this.images[0] ?? null;
  const v0 = this.variants?.find((v) => v.images?.length);
  return v0 ? v0.images[0] : null;
});

// Simple percent off from legacy top-level pricing (if used)
ProductSchema.virtual("discountPercent").get(function (this: IProduct) {
  const base = getEffectivePrice(this);
  if (!this.compareAtPrice || typeof base !== "number" || this.compareAtPrice <= 0) return 0;
  if (this.compareAtPrice <= base) return 0;
  return Math.round(((this.compareAtPrice - base) / this.compareAtPrice) * 100);
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

// Text search across key fields
ProductSchema.index(
  {
    name: "text",
    brand: "text",
    description: "text",
    tag: "text",
    "seo.title": "text",
  },
  {
    name: "product_text",
    weights: { name: 10, brand: 5, description: 3, tag: 2 },
  }
);

// Storefront filters / sorts
ProductSchema.index({ status: 1, category: 1, price: 1, createdAt: -1 });
ProductSchema.index(
  { seller: 1, slug: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: { $ne: true } },
    collation: { locale: "en", strength: 2 }, // case-insensitive
  }
);
ProductSchema.index({ isTrending: 1, salesCount: -1, ratingAvg: -1 });

// unique (seller, customId)
ProductSchema.index(
  { seller: 1, customId: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: { $ne: true } },
    collation: { locale: "en", strength: 2 }, // case-insensitive
  }
);

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

const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
