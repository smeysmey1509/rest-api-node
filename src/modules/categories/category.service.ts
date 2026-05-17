import Product from "../products/product.model";
import { AppError } from "../../shared/errors/app-error";
import { generateSlug } from "../../shared/utils/generateSlug";
import { categoryRepository } from "./category.repository";

const parseSort = (input?: string): Record<string, 1 | -1> => {
  const sort: Record<string, 1 | -1> = {};
  (input || "categoryName:1").split(",").forEach((pair) => {
    const [field, dir] = pair.split(":");
    if (field) sort[field] = dir === "-1" ? -1 : 1;
  });
  return sort;
};

const normalizePayload = (payload: Record<string, unknown>) => {
  const categoryName = String(payload.categoryName || payload.name || "").trim();
  const categoryId = String(payload.categoryId || payload.slug || generateSlug(categoryName)).trim();
  return {
    categoryId,
    categoryName,
    description: String(payload.description || ""),
    productCount: Number(payload.productCount || 0),
    totalStock: Number(payload.totalStock || 0),
    avgPrice: Number(payload.avgPrice || 0),
    totalSales: Number(payload.totalSales || 0),
  };
};

export const categoryService = {
  async list(query: Record<string, unknown>) {
    const q = String(query.q ?? "").trim();
    const page = Math.max(parseInt(String(query.page ?? "1"), 10), 1);
    const limit = Math.min(Math.max(parseInt(String(query.limit ?? "25"), 10), 1), 100);
    const skip = (page - 1) * limit;
    const sort = parseSort(String(query.sort ?? "categoryName:1"));
    const filter: any = {};
    if (q) {
      filter.$or = [
        { categoryName: { $regex: q, $options: "i" } },
        { categoryId: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }

    const [categories, total] = await Promise.all([
      categoryRepository.list(filter, sort, skip, limit),
      categoryRepository.count(filter),
    ]);
    return { categories, total, page, perPage: limit, totalPages: Math.ceil(total / limit) };
  },

  async listRaw(query: Record<string, unknown>) {
    const result = await this.list({ ...query, limit: query.limit || 100 });
    return result.categories;
  },

  async getById(id: string) {
    const category = await categoryRepository.findById(id);
    if (!category) throw new AppError("Category not found.", 404);
    return category;
  },

  async create(payload: Record<string, unknown>) {
    const normalized = normalizePayload(payload);
    if (!normalized.categoryId || !normalized.categoryName) {
      throw new AppError("categoryId and categoryName are required", 400);
    }
    try {
      return await categoryRepository.create(normalized);
    } catch (err: any) {
      if (err?.code === 11000) throw new AppError("Duplicate category", 409, undefined, err.keyValue);
      throw err;
    }
  },

  async update(id: string, payload: Record<string, unknown>) {
    const updates: Record<string, unknown> = {};
    if (payload.categoryName !== undefined || payload.name !== undefined) {
      updates.categoryName = String(payload.categoryName || payload.name || "").trim();
    }
    if (payload.categoryId !== undefined || payload.slug !== undefined) {
      updates.categoryId = String(payload.categoryId || payload.slug || "").trim();
    }
    if (payload.description !== undefined) updates.description = String(payload.description);
    if (payload.productCount !== undefined) updates.productCount = Number(payload.productCount) || 0;
    if (payload.totalStock !== undefined) updates.totalStock = Number(payload.totalStock) || 0;
    if (payload.avgPrice !== undefined) updates.avgPrice = Number(payload.avgPrice) || 0;
    if (payload.totalSales !== undefined) updates.totalSales = Number(payload.totalSales) || 0;
    const category = await categoryRepository.update(id, updates);
    if (!category) throw new AppError("Category not found.", 404);
    return category;
  },

  async remove(id: string) {
    const usedByProduct = await Product.exists({ category: id });
    if (usedByProduct) {
      throw new AppError("Category is used by products and cannot be deleted.", 400);
    }
    const category = await categoryRepository.delete(id);
    if (!category) throw new AppError("Category not found.", 404);
    return { msg: "Category deleted successfully." };
  },
};
