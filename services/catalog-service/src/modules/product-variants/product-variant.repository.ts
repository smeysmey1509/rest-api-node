import { ClientSession, Types } from "mongoose";
import ProductVariant from "./product-variant.model";

export const productVariantRepository = {
  listByProduct(productId: string) {
    return ProductVariant.find({ productId, isActive: { $ne: false } }).sort({ createdAt: -1 }).lean();
  },

  findById(id: string, session?: ClientSession | null) {
    const query = ProductVariant.findById(id);
    if (session) query.session(session);
    return query;
  },

  findBySku(sku: string) {
    return ProductVariant.findOne({ sku: String(sku).trim().toUpperCase() });
  },

  create(payload: Record<string, unknown>) {
    return ProductVariant.create(payload);
  },

  update(id: string, payload: Record<string, unknown>) {
    return ProductVariant.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  },

  deactivate(id: string) {
    return ProductVariant.findByIdAndUpdate(id, { isActive: false }, { new: true });
  },

  async updateStockSummary(variantId: string | Types.ObjectId, summary: Record<string, number>, session?: ClientSession) {
    return ProductVariant.findByIdAndUpdate(
      variantId,
      { $set: Object.fromEntries(Object.entries(summary).map(([key, value]) => [`stockSummary.${key}`, value])) },
      { new: true, runValidators: true, session }
    );
  },
};
