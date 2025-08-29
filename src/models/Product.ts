// models/Product.ts
import mongoose, { Schema, Types, Document, Model } from "mongoose";
import mongooseLeanVirtuals from "mongoose-lean-virtuals";

/* ===================== Types ===================== */

export type PublishStatus = "Published" | "Unpublished";
export type CurrencyCode = "USD" | "KHR" | "THB" | "EUR" | "GBP" | "JPY" | string;

// Price at a point-in-time (support compareAt and volume tiers)
export interface IPriceTier {
  minQty: number;                 // inclusive
  amount: number;                 // minor units (e.g., cents)
}

export interface IPrice {
  currency: CurrencyCode;
  amount: number;                 // base price (minor units)
  compareAt?: number;             // MSRP/list price (>= amount)
  tiers?: IPriceTier[];           // volume/wholesale breaks
}

// Inventory with reservations (e.g., for in-flight carts)
export interface IInventory {
  onHand: number;                 // physical on-hand
  reserved: number;               // held for open orders/carts
  safetyStock: number;            // buffer for OOS protection
}

// Physical attributes for shipping/rates
export interface IDimensions {
  weightG?: number;               // grams
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
}

// Media (image/video) — keep raw keys if using CDN
export interface IMedia {
  url: string;
  alt?: string;
  role?: "primary" | "gallery" | "thumbnail";
}

// SEO / marketing helpers
export interface ISeo {
  title?: string;
  description?: string;
  keywords?: string[];
}

// Localized content
export interface ILocalized {
  [locale: string]: {
    name?: string;
    description?: string;
  };
}

// Variant / SKU
export interface IVariant {
  _id: Types.ObjectId;
  sku: string;                    // seller-unique
  barcode?: string;
  gtin?: string;
  attributes: Record<string, string>; // e.g. { color: "black", size: "M" }
  price: IPrice;
  inventory: IInventory;
  media: IMedia[];
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Main Product
export interface IProduct extends Document {
  // core
  name: string;
  slug: string;
  description?: string;
  localized?: ILocalized;

  // merchandising
  brand?: string;
  categories: Types.ObjectId[];   // multi-categorization
  seller: Types.ObjectId;         // tenant / marketplace seller

  // status & tags
  status: PublishStatus;
  tags: string[];
  isTrending?: boolean;

  // variants
  variants: IVariant[];           // 1..N
  optionKeys: string[];           // e.g., ["color", "size"]

  // denormalized analytics (quick sort/filter)
  ratingAvg: number;
  ratingCount: number;
  salesCount: number;

  // media (fallbacks if variants empty)
  media: IMedia[];

  // SEO / logistics
  seo?: ISeo;
  defaultCurrency: CurrencyCode;
  dimensions?: IDimensions;

  // moderation & compliance
  isAdult?: boolean;
  isHazardous?: boolean;

  // soft delete
  isDeleted: boolean;
  deletedAt?: Date;

  // virtuals
  primaryImage?: string | null;
  availableTotal?: number;        // sum available across variants

  createdAt: Date;
  updatedAt: Date;
}

interface IProductModel extends Model<IProduct> {
  findBySlug(sellerId: Types.ObjectId, slug: string): Promise<IProduct | null>;
}

/* ===================== Utils ===================== */

const slugify = (s: string) =>
  s.toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/* ===================== Sub Schemas ===================== */

const PriceTierSchema = new Schema<IPriceTier>(
  {
    minQty: { type: Number, min: 1, required: true },
    amount: { type: Number, min: 0, required: true }, // minor units
  },
  { _id: false }
);

const PriceSchema = new Schema<IPrice>(
  {
    currency: { type: String, minlength: 3, maxlength: 3, required: true },
    amount: { type: Number, min: 0, required: true },
    compareAt: {
      type: Number,
      min: 0,
      validate: {
        validator(v: number | undefined, ctx: any) {
          if (v == null) return true;
          return v >= ctx.amount;
        },
        message: "compareAt must be >= amount",
      },
    },
    tiers: { type: [PriceTierSchema], default: [] },
  },
  { _id: false }
);

const InventorySchema = new Schema<IInventory>(
  {
    onHand: { type: Number, min: 0, default: 0 },
    reserved: { type: Number, min: 0, default: 0 },
    safetyStock: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

const MediaSchema = new Schema<IMedia>(
  {
    url: { type: String, trim: true, required: true },
    alt: { type: String, trim: true, default: "" },
    role: { type: String, enum: ["primary", "gallery", "thumbnail"], default: "gallery" },
  },
  { _id: false }
);

const VariantSchema = new Schema<IVariant>(
  {
    sku: { type: String, required: true, trim: true },
    barcode: { type: String, trim: true },
    gtin: { type: String, trim: true },
    attributes: { type: Schema.Types.Mixed, default: {} },
    price: { type: PriceSchema, required: true },
    inventory: { type: InventorySchema, required: true, default: {} },
    media: { type: [MediaSchema], default: [] },
    isActive: { type: Boolean, default: true, index: true },
  },
  { _id: true, timestamps: true }
);

/* ===================== Product Schema ===================== */

const ProductSchema = new Schema<IProduct, IProductModel>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 200 },
    slug: { type: String, required: false, trim: true, lowercase: true, index: true },
    description: { type: String, default: "", maxlength: 50_000 },
    localized: { type: Schema.Types.Mixed, default: {} },

    brand: { type: String, trim: true, default: "" },
    categories: [{ type: Schema.Types.ObjectId, ref: "Category", index: true }],
    seller: { type: Schema.Types.ObjectId, ref: "Seller", required: true, index: true },

    status: { type: String, enum: ["Published", "Unpublished"], default: "Unpublished", index: true },
    tags: {
      type: [String],
      default: [],
      set: (arr: string[]) => Array.from(new Set((arr || []).map((t) => t.trim().toLowerCase()))),
      index: true,
    },
    isTrending: { type: Boolean, default: false, index: true },

    optionKeys: { type: [String], default: [] },
    variants: { type: [VariantSchema], default: [] },

    ratingAvg: { type: Number, default: 0, min: 0, max: 5, index: true },
    ratingCount: { type: Number, default: 0, min: 0 },
    salesCount: { type: Number, default: 0, min: 0, index: true },

    media: { type: [MediaSchema], default: [] },
    seo: {
      title: { type: String, trim: true, default: "" },
      description: { type: String, trim: true, default: "" },
      keywords: { type: [String], default: [] },
    },

    defaultCurrency: { type: String, minlength: 3, maxlength: 3, default: "USD" },
    dimensions: {
      weightG: { type: Number, min: 0 },
      lengthMm: { type: Number, min: 0 },
      widthMm: { type: Number, min: 0 },
      heightMm: { type: Number, min: 0 },
    },

    isAdult: { type: Boolean, default: false, index: true },
    isHazardous: { type: Boolean, default: false },

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

/* ===================== Virtuals ===================== */

// First primary media across product or variants
ProductSchema.virtual("primaryImage").get(function (this: IProduct) {
  const pick = (arr: IMedia[]) =>
    (arr || []).find((m) => m.role === "primary")?.url || (arr[0]?.url ?? null);
  return pick(this.media) || pick(this.variants?.[0]?.media || []);
});

// Total available inventory across active variants
ProductSchema.virtual("availableTotal").get(function (this: IProduct) {
  const sum = (n: number | undefined) => (typeof n === "number" ? n : 0);
  return (this.variants || [])
    .filter((v) => v.isActive)
    .reduce((acc, v) => {
      const onHand = sum(v.inventory?.onHand);
      const reserved = sum(v.inventory?.reserved);
      const safety = sum(v.inventory?.safetyStock);
      const available = Math.max(0, onHand - reserved - safety);
      return acc + available;
    }, 0);
});

/* ===================== Statics ===================== */

ProductSchema.statics.findBySlug = function (sellerId: Types.ObjectId, slug: string) {
  return this.findOne({ seller: sellerId, slug, isDeleted: { $ne: true } });
};

/* ===================== Hooks ===================== */

// Default scope: hide soft-deleted unless explicitly asked
ProductSchema.pre(/^find/, function (next) {
  // @ts-ignore
  if (!this.getOptions()?.withDeleted) this.where({ isDeleted: { $ne: true } });
  next();
});

// Normalize slug (generate from name if missing)
ProductSchema.pre("validate", function (next) {
  if (!this.slug && this.name) this.slug = slugify(this.name);
  next();
});
ProductSchema.pre("save", function (next) {
  if (this.isModified("slug")) this.slug = slugify(this.slug);
  next();
});

/* ===================== Indexes ===================== */

// Text search (names, descriptions, brand, tags)
ProductSchema.index(
  { name: "text", description: "text", brand: "text", "seo.title": "text", tags: "text" },
  { name: "product_text", weights: { name: 10, brand: 5, description: 3, tags: 2 } }
);

// Seller-scoped unique slug for active products
ProductSchema.index(
  { seller: 1, slug: 1 },
  { unique: true, partialFilterExpression: { isDeleted: { $ne: true } } }
);

// Fast storefront queries
ProductSchema.index({ seller: 1, status: 1, createdAt: -1 });
ProductSchema.index({ categories: 1, status: 1, "variants.price.amount": 1 });
ProductSchema.index({ "variants.isActive": 1, "variants.attributes.color": 1 }); // example attr
ProductSchema.index({ isTrending: 1, salesCount: -1, ratingAvg: -1 });

// Unique SKU per seller (across variants)
ProductSchema.index(
  { seller: 1, "variants.sku": 1 },
  { unique: true, partialFilterExpression: { isDeleted: { $ne: true } } }
);

// “Available > 0” queries (via partial index on computed rule)
// MongoDB can’t index virtuals; but a practical approximation is onHand > reserved + safetyStock
ProductSchema.index(
  { "variants.inventory.onHand": 1, "variants.inventory.reserved": 1 },
  { name: "inv_lookup" }
);

/* ===================== Plugins & Export ===================== */

ProductSchema.plugin(mongooseLeanVirtuals);

const Product =
  (mongoose.models.Product as IProductModel) ||
  mongoose.model<IProduct, IProductModel>("Product", ProductSchema);

export default Product;
