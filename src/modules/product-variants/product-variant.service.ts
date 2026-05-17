import mongoose, { Types } from "mongoose";
import Product from "../products/product.model";
import { AppError } from "../../shared/errors/app-error";
import { productVariantRepository } from "./product-variant.repository";

const ensureObjectId = (id: unknown, field: string) => {
  if (!id || !mongoose.isValidObjectId(id)) throw new AppError(`Invalid ${field} id`, 400);
  return new Types.ObjectId(String(id));
};

const toNumber = (value: unknown, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const parseObject = (value: unknown) => {
  if (!value) return {};
  if (typeof value === "object") return value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
};

const normalizePricing = (payload: Record<string, unknown>) => {
  const pricing = parseObject(payload.pricing);
  const salePrice = toNumber(pricing.salePrice ?? payload.salePrice ?? payload.price, 0);
  const costPrice = pricing.costPrice ?? payload.costPrice;
  return {
    currency: String(pricing.currency || payload.currency || "USD").toUpperCase(),
    salePrice,
    compareAtPrice:
      pricing.compareAtPrice ?? payload.compareAtPrice
        ? toNumber(pricing.compareAtPrice ?? payload.compareAtPrice)
        : undefined,
    dealerPrice:
      pricing.dealerPrice ?? payload.dealerPrice
        ? toNumber(pricing.dealerPrice ?? payload.dealerPrice)
        : undefined,
    costPrice: costPrice == null ? undefined : toNumber(costPrice),
  };
};

export const productVariantService = {
  async listByProduct(productId: string) {
    ensureObjectId(productId, "product");
    return productVariantRepository.listByProduct(productId);
  },

  async create(productId: string, payload: Record<string, unknown>) {
    const productObjectId = ensureObjectId(productId, "product");
    const product = await Product.findById(productObjectId).select("_id").lean();
    if (!product) throw new AppError("Product not found", 404);
    if (!payload.sku) throw new AppError("sku is required", 400);

    const variant = await productVariantRepository.create({
      productId: productObjectId,
      sku: String(payload.sku),
      barcode: payload.barcode ? String(payload.barcode) : undefined,
      optionValues: parseObject(payload.optionValues || payload.options),
      pricing: normalizePricing(payload),
      stockSummary: parseObject(payload.stockSummary),
      images: Array.isArray(payload.images) ? payload.images : [],
      isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
    });
    return variant;
  },

  async update(variantId: string, payload: Record<string, unknown>) {
    ensureObjectId(variantId, "variant");
    const updates: Record<string, unknown> = {};
    if (payload.sku !== undefined) updates.sku = String(payload.sku);
    if (payload.barcode !== undefined) updates.barcode = payload.barcode ? String(payload.barcode) : undefined;
    if (payload.optionValues !== undefined || payload.options !== undefined) {
      updates.optionValues = parseObject(payload.optionValues || payload.options);
    }
    if (
      payload.pricing !== undefined ||
      payload.salePrice !== undefined ||
      payload.price !== undefined ||
      payload.costPrice !== undefined
    ) {
      updates.pricing = normalizePricing(payload);
    }
    if (payload.stockSummary !== undefined) updates.stockSummary = parseObject(payload.stockSummary);
    if (payload.images !== undefined) updates.images = Array.isArray(payload.images) ? payload.images : [];
    if (payload.isActive !== undefined) updates.isActive = Boolean(payload.isActive);

    const variant = await productVariantRepository.update(variantId, updates);
    if (!variant) throw new AppError("Product variant not found", 404);
    return variant;
  },

  async remove(variantId: string) {
    ensureObjectId(variantId, "variant");
    const variant = await productVariantRepository.deactivate(variantId);
    if (!variant) throw new AppError("Product variant not found", 404);
    return { msg: "Product variant deleted successfully." };
  },
};
