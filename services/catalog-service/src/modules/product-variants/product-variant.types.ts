import { Types } from "mongoose";

export type VariantPricing = {
  currency: string;
  salePrice: number;
  compareAtPrice?: number;
  dealerPrice?: number;
  costPrice?: number;
};

export type VariantStockSummary = {
  onHand: number;
  available: number;
  reserved: number;
  sold: number;
  safetyStock: number;
};

export type ProductVariantPayload = {
  productId: Types.ObjectId | string;
  sku: string;
  barcode?: string;
  optionValues?: Record<string, unknown>;
  pricing: VariantPricing;
  stockSummary?: Partial<VariantStockSummary>;
  images?: Array<{ url: string; alt?: string; isPrimary?: boolean; sortOrder?: number }>;
  isActive?: boolean;
};
