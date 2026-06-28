import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IVariantImage {
  url: string;
  alt?: string;
  isPrimary?: boolean;
  sortOrder?: number;
}

export interface IVariantPricing {
  currency: string;
  salePrice: number;
  compareAtPrice?: number;
  dealerPrice?: number;
  costPrice?: number;
}

export interface IVariantStockSummary {
  onHand: number;
  available: number;
  reserved: number;
  sold: number;
  safetyStock: number;
}

export interface IProductVariantDocument extends Document {
  productId: Types.ObjectId;
  sku: string;
  barcode?: string;
  optionValues: Map<string, unknown>;
  pricing: IVariantPricing;
  stockSummary: IVariantStockSummary;
  images: IVariantImage[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VariantImageSchema = new Schema<IVariantImage>(
  {
    url: { type: String, required: true, trim: true },
    alt: { type: String, trim: true, default: "" },
    isPrimary: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false }
);

const VariantPricingSchema = new Schema<IVariantPricing>(
  {
    currency: { type: String, required: true, uppercase: true, trim: true, default: "USD" },
    salePrice: { type: Number, required: true, min: 0 },
    compareAtPrice: {
      type: Number,
      min: 0,
      validate: {
        validator(this: IVariantPricing, value?: number) {
          return value == null || value >= this.salePrice;
        },
        message: "compareAtPrice must be greater than or equal to salePrice.",
      },
    },
    dealerPrice: { type: Number, min: 0 },
    costPrice: { type: Number, min: 0 },
  },
  { _id: false }
);

const VariantStockSummarySchema = new Schema<IVariantStockSummary>(
  {
    onHand: { type: Number, min: 0, default: 0 },
    available: { type: Number, min: 0, default: 0 },
    reserved: { type: Number, min: 0, default: 0 },
    sold: { type: Number, min: 0, default: 0 },
    safetyStock: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

const ProductVariantSchema = new Schema<IProductVariantDocument>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    sku: { type: String, required: true, trim: true, uppercase: true },
    barcode: { type: String, trim: true },
    optionValues: { type: Map, of: Schema.Types.Mixed, default: {} },
    pricing: { type: VariantPricingSchema, required: true },
    stockSummary: { type: VariantStockSummarySchema, default: () => ({}) },
    images: { type: [VariantImageSchema], default: [] },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { flattenMaps: true },
    toObject: { flattenMaps: true },
  }
);

ProductVariantSchema.pre("validate", function (next) {
  if (this.sku) this.sku = String(this.sku).trim().toUpperCase();
  if (this.pricing?.currency) this.pricing.currency = String(this.pricing.currency).toUpperCase();
  const summary = this.stockSummary || ({} as IVariantStockSummary);
  const available = Number(summary.available ?? 0);
  if (available < 0) this.invalidate("stockSummary.available", "available stock cannot be negative.");
  next();
});

ProductVariantSchema.index({ productId: 1, sku: 1 });
ProductVariantSchema.index({ sku: 1 }, { unique: true });
ProductVariantSchema.index({ barcode: 1 }, { sparse: true });
ProductVariantSchema.index({ productId: 1, isActive: 1 });

const ProductVariant: Model<IProductVariantDocument> =
  mongoose.models.ProductVariant ||
  mongoose.model<IProductVariantDocument>("ProductVariant", ProductVariantSchema);

export default ProductVariant;
