import mongoose, { Schema, Model, Types, Document } from "mongoose";

export type PublishStatus =
  | "Published"
  | "Unpublished"
  | "DRAFT"
  | "ACTIVE"
  | "INACTIVE"
  | "ARCHIVED";

export type ProductType =
  | "PHONE"
  | "LAPTOP"
  | "COMPUTER"
  | "TABLET"
  | "ACCESSORY"
  | "ELECTRONIC"
  | "OTHER";

export type ProductTrackingType = "SERIAL" | "BATCH" | "NONE";

export interface IProductImage {
  url: string;
  alt?: string;
  isPrimary?: boolean;
  sortOrder?: number;
}

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
  sku?: string;
  price?: number;
  stock?: number;
  inventory?: IInventory;
  attributes?: Record<string, string>;
  images: string[];
  isActive?: boolean;
}

export interface IProduct extends Document {
  // core
  productId: string;
  productCode?: string;
  name: string;
  slug: string;
  description?: string;
  feature?: string;
  features?: string[];

  // merchandising (LEGACY top-level, used when no variants exist)
  brand?: Types.ObjectId;
  price: number;
  compareAtPrice?: number;
  currency?: string;

  // inventory (LEGACY top-level)
  stock: number;

  // relations
  category: Types.ObjectId;
  seller: Types.ObjectId;
  brandId?: Types.ObjectId;
  categoryId?: Types.ObjectId;
  createdBy?: Types.ObjectId;
  productCollectionId?: Types.ObjectId;
  groupId?: string;

  // status & tags
  status: PublishStatus;
  tag: string[];
  tags?: string[];
  isFeatured?: boolean;

  // media
  images: Array<string | IProductImage>;
  primaryImageIndex: number;

  // analytics (denormalized for speed)
  ratingAvg: number;
  ratingCount: number;
  ratingSum: number;
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
  cost?: number;

  // virtuals (not stored)
  primaryImage?: string | null;
  discountPercent?: number;
  availableTotal?: number;
  productType?: ProductType | string;
  trackingType?: ProductTrackingType;

  //price
  actualPrice?: number;
  dealerPrice?: number;

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

const ImageSchema = new Schema<IProductImage>(
  {
    url: { type: String, required: true, trim: true },
    alt: { type: String, trim: true, default: "" },
    isPrimary: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false }
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
    productCode: {
      type: String,
      trim: true,
      uppercase: true,
      validate: {
        validator(v: string) {
          if (!v) return true;
          return CUSTOM_ID_RE.test(v);
        },
        message:
          "productCode must be 3–32 chars, A–Z, 0–9, dot, underscore or dash (no spaces).",
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
    slug: { type: String, required: false },
    description: { type: String, default: "", maxlength: 256 },
    feature: { type: String, default: "", maxlength: 10000 },
    features: { type: [String], default: [] },

    // merchandising (legacy top-level)
    brand: { type: Schema.Types.ObjectId, ref: "Brand", index: true },
    brandId: { type: Schema.Types.ObjectId, ref: "Brand", index: true },
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
      maxlength: 6,
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
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: false,
      index: true,
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    productCollectionId: {
      type: Schema.Types.ObjectId,
      ref: "ProductCollection",
      required: false,
      index: true,
    },
    groupId: { type: String, trim: true, index: true },

    // status & tags
    status: {
      type: String,
      enum: ["Published", "Unpublished", "DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"],
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
    tags: {
      type: [String],
      default: [],
      set: (arr: string[]) =>
        Array.from(
          new Set((arr || []).map((t) => String(t).trim()).filter(Boolean))
        ),
      index: true,
    },
    isFeatured: { type: Boolean, default: false, index: true },

    // media
    images: { type: [Schema.Types.Mixed], default: [] },
    primaryImageIndex: { type: Number, default: 0, min: 0 },

    // analytics
    ratingAvg: { type: Number, default: 0, min: 0, max: 5, index: true },
    ratingCount: { type: Number, default: 0, min: 0 },
    ratingSum: { type: Number, default: 0, min: 0 },
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
    cost: { type: Number, min: 0, index: true },

    productType: {
      type: String,
      enum: ["PHONE", "LAPTOP", "COMPUTER", "TABLET", "ACCESSORY", "ELECTRONIC", "OTHER", ""],
      default: "OTHER",
      index: true,
    },
    trackingType: {
      type: String,
      enum: ["SERIAL", "BATCH", "NONE"],
      default: "NONE",
      index: true,
    },

    //price
    actualPrice: { type: Number, min: 0, index: true },
    dealerPrice: { type: Number, min: 0, index: true },
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
    doc.cost = min;
  } else {
    // no variants → mirror legacy top-level price if available, else unset
    if (typeof doc.price === "number") {
      doc.priceMin = doc.price;
      doc.priceMax = doc.price;
      doc.cost = doc.price;
    } else {
      doc.priceMin = undefined;
      doc.priceMax = undefined;
      doc.cost = undefined;
    }
  }
}

function normalizeProductStatus(value: string | undefined) {
  if (!value) return value;
  const normalized = String(value).toUpperCase();
  if (normalized === "PUBLISHED") return "Published";
  if (normalized === "UNPUBLISHED") return "Unpublished";
  return normalized;
}

function getImageUrl(image: string | IProductImage | undefined): string | null {
  if (!image) return null;
  if (typeof image === "string") return image;
  return image.url || null;
}

// ---- Hooks ----

// Normalize slug & productId and compute price summaries early
ProductSchema.pre("validate", function (next) {
  if (!this.slug && this.name) this.slug = slugify(this.name);
  if (this.slug) this.slug = slugify(this.slug);

  if (this.productId) this.productId = normalizeCustomId(this.productId)!;
  if (this.productCode) this.productCode = normalizeCustomId(this.productCode)!;
  if (!this.productId) {
    const prefix = this.brand
      ? String(this.brand)
          .replace(/[^A-Za-z0-9]/g, "")
          .slice(0, 3)
          .toUpperCase()
      : "PRD";
    this.productId = generateCustomId(prefix);
  }
  if (!this.productCode) this.productCode = this.productId;
  if (!this.brandId && this.brand) this.brandId = this.brand;
  if (!this.brand && this.brandId) this.brand = this.brandId;
  if (!this.categoryId && this.category) this.categoryId = this.category;
  if (!this.category && this.categoryId) this.category = this.categoryId;
  if (!this.createdBy && this.seller) this.createdBy = this.seller;
  if (!this.seller && this.createdBy) this.seller = this.createdBy;

  if (this.productType) this.productType = String(this.productType).toUpperCase();
  if (this.trackingType) this.trackingType = String(this.trackingType).toUpperCase() as ProductTrackingType;
  if (this.status) {
    const status = normalizeProductStatus(String(this.status));
    if (["Published", "Unpublished", "DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"].includes(String(status))) {
      this.status = status as PublishStatus;
    }
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
  if (this.images?.length) {
    return getImageUrl(this.images[this.primaryImageIndex]) ?? getImageUrl(this.images[0]) ?? null;
  }
  const v0 = this.variants?.find((v) => v.images?.length);
  return v0 ? v0.images[0] : null;
});

ProductSchema.virtual("flags").get(function (this: IProduct) {
  return {
    isFeatured: Boolean(this.isFeatured),
    isTrending: Boolean(this.isTrending),
    isAdult: Boolean(this.isAdult),
    isHazardous: Boolean(this.isHazardous),
    isDeleted: Boolean(this.isDeleted),
  };
});

ProductSchema.virtual("rating").get(function (this: IProduct) {
  return {
    avg: this.ratingAvg || 0,
    count: this.ratingCount || 0,
    sum: this.ratingSum || 0,
  };
});

ProductSchema.virtual("sales").get(function (this: IProduct) {
  return { totalSold: this.salesCount || 0 };
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
ProductSchema.index({ status: 1, isDeleted: 1, createdAt: -1, _id: -1 });
ProductSchema.index(
  { seller: 1, slug: 1, name: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: { $ne: true } },
    collation: { locale: "en", strength: 2 },
  }
);
ProductSchema.index({ isTrending: 1, salesCount: -1, ratingAvg: -1 });
ProductSchema.index({ productCode: 1 }, { unique: true, sparse: true });
ProductSchema.index({ slug: 1 }, { unique: true, sparse: true });
ProductSchema.index({ productType: 1, trackingType: 1, status: 1 });

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

// --- Virtuals: Split date and time ---
ProductSchema.virtual("createdDate").get(function (this: IProduct) {
  if (!this.createdAt) return null;
  return this.createdAt.toISOString().split("T")[0]; // "YYYY-MM-DD"
});

ProductSchema.virtual("createdTime").get(function (this: IProduct) {
  if (!this.createdAt) return null;
  return this.createdAt.toISOString().split("T")[1].split(".")[0]; // "HH:MM:SS"
});

ProductSchema.virtual("updatedDate").get(function (this: IProduct) {
  if (!this.updatedAt) return null;
  return this.updatedAt.toISOString().split("T")[0];
});

ProductSchema.virtual("updatedTime").get(function (this: IProduct) {
  if (!this.updatedAt) return null;
  return this.updatedAt.toISOString().split("T")[1].split(".")[0];
});

const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
