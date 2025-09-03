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
  slug: string;
  description?: string;

  // merchandising (LEGACY top-level, used when no variants exist)
  brand?: string;
  price: number; // legacy single price
  compareAtPrice?: number;
  currency?: string;

  // inventory (LEGACY top-level)
  stock: number;

  // relations
  category: Types.ObjectId;
  seller: Types.ObjectId;

  // status & tags
  status: PublishStatus;
  tag: string[];

  // media
  images: string[];
  primaryImageIndex: number;

  // analytics (denormalized for speed)
  ratingAvg: number;
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

  // derived (stored for fast list/filter)
  priceMin?: number;
  priceMax?: number;
  defaultPrice?: number; // usually == priceMin when variants exist

  // virtuals (not stored)
  primaryImage?: string | null;
  discountPercent?: number;
  availableTotal?: number;

  dedupeKey: string;

  createdAt: Date;
  updatedAt: Date;
}

function generateCustomId(prefix = "PRD"): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

const CUSTOM_ID_RE = /^[A-Z0-9][A-Z0-9._-]{2,31}$/; // 3..32
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
    inventory: { type: InventorySchema, default: undefined },
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
      immutable: true,
      required: false,
      validate: {
        validator(v: string) {
          if (!v) return true;
          return CUSTOM_ID_RE.test(v);
        },
        message:
          "productId must be 3–32 chars, A–Z, 0–9, dot, underscore or dash (no spaces).",
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
    slug: { type: String, required: false, index: true },
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
          if (v == null) return true;
          const base = getEffectiveBasePrice(this); // price or min variant
          if (typeof base !== "number") return true;
          return v >= base;
        },
        message: "compareAtPrice must be ≥ the effective price.",
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

    // analytics
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

    // ======= NEW: stored summary prices for fast listing/filtering =======
    priceMin: { type: Number, min: 0, index: true },
    priceMax: { type: Number, min: 0, index: true },
    defaultPrice: { type: Number, min: 0, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true, flattenMaps: true },
    toObject: { virtuals: true, flattenMaps: true },
  }
);

// ---- Helpers ----
function getActiveVariantPrices(doc: any): number[] {
  if (!Array.isArray(doc.variants) || !doc.variants.length) return [];
  return doc.variants
    .filter((v: any) => v?.isActive !== false)
    .map((v: any) => Number(v?.price))
    .filter((n: number) => Number.isFinite(n) && n >= 0);
}

function getEffectiveBasePrice(doc: any): number | undefined {
  // Prefer legacy top-level price if present, otherwise min active variant price
  if (typeof doc.price === "number") return doc.price;
  const prices = getActiveVariantPrices(doc);
  return prices.length ? Math.min(...prices) : undefined;
}

function recomputePriceSummaries(doc: any) {
  const prices = getActiveVariantPrices(doc);
  if (prices.length) {
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    doc.priceMin = min;
    doc.priceMax = max;
    doc.defaultPrice = min; // business rule: default is the entry price
  } else {
    // no variants → mirror legacy top-level price if available, else unset
    if (typeof doc.price === "number") {
      doc.priceMin = doc.price;
      doc.priceMax = doc.price;
      doc.defaultPrice = doc.price;
    } else {
      doc.priceMin = undefined;
      doc.priceMax = undefined;
      doc.defaultPrice = undefined;
    }
  }
}

// ---- Hooks ----

// Normalize slug & productId and compute price summaries early
ProductSchema.pre("validate", function (next) {
  if (!this.slug && this.name) this.slug = slugify(this.name);
  if (this.slug) this.slug = slugify(this.slug);

  if (this.productId) this.productId = normalizeCustomId(this.productId)!;
  if (!this.productId) {
    const prefix = this.brand
      ? String(this.brand)
          .replace(/[^A-Za-z0-9]/g, "")
          .slice(0, 3)
          .toUpperCase()
      : "PRD";
    this.productId = generateCustomId(prefix);
  }

  // derive price summaries whenever variants/price changed (or on new doc)
  if (this.isNew || this.isModified("variants") || this.isModified("price")) {
    recomputePriceSummaries(this);
  }

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

  // double-safety: if something else mutated variants after validate
  if (this.isModified("variants") || this.isModified("price")) {
    recomputePriceSummaries(this);
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

// Require either variants[] or a valid top-level price
ProductSchema.path("variants").validate(function (variants: IProductVariant[]) {
  if (Array.isArray(variants) && variants.length > 0) return true;
  return typeof this.price === "number" && this.price >= 0;
}, "Either provide variants[] or a valid top-level price.");

// Virtuals
ProductSchema.virtual("primaryImage").get(function (this: IProduct) {
  if (this.images?.length)
    return this.images[this.primaryImageIndex] ?? this.images[0] ?? null;
  const v0 = this.variants?.find((v) => v.images?.length);
  return v0 ? v0.images[0] : null;
});

ProductSchema.virtual("discountPercent").get(function (this: IProduct) {
  const base = getEffectiveBasePrice(this);
  if (
    !this.compareAtPrice ||
    typeof base !== "number" ||
    this.compareAtPrice <= 0
  )
    return 0;
  if (this.compareAtPrice <= base) return 0;
  return Math.round(((this.compareAtPrice - base) / this.compareAtPrice) * 100);
});

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

// Indexes
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
ProductSchema.index({ status: 1, category: 1, priceMin: 1, createdAt: -1 }); // use priceMin for sort
ProductSchema.index(
  { seller: 1, slug: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: { $ne: true } },
    collation: { locale: "en", strength: 2 },
  }
);
ProductSchema.index({ isTrending: 1, salesCount: -1, ratingAvg: -1 });

// Unique productId per seller (ignores soft-deleted)
ProductSchema.index(
  { seller: 1, productId: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: { $ne: true } },
    collation: { locale: "en", strength: 2 },
  }
);

// Unique slug per seller (ignores soft-deleted)
ProductSchema.index(
  { seller: 1, slug: 1 },
  { unique: true, partialFilterExpression: { isDeleted: { $ne: true } } }
);

// Unique SKU per seller across variants (ignores soft-deleted)
ProductSchema.index(
  { seller: 1, "variants.sku": 1 },
  { unique: true, partialFilterExpression: { isDeleted: { $ne: true } } }
);

const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
