import mongoose, { Types } from "mongoose";
import { AppError } from "../../common/utils/appError";
import { generateSlug } from "../../common/utils/generateSlug";
import { normalizeRole, Roles } from "../../common/constants/roles";
import { productRepository } from "./product.repository";
import Product from "./product.model";

const toNumber = (value: unknown, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const parseJson = <T>(value: unknown, fallback: T): T => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "object") return value as T;
  if (typeof value === "string" && value.trim()) {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
};

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    const parsed = parseJson<string[]>(value, []);
    if (Array.isArray(parsed) && parsed.length) return parsed.map(String).filter(Boolean);
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

const normalizeStatus = (value: unknown) => {
  const normalized = String(value || "").toUpperCase();
  if (["UNPUBLISHED", "INACTIVE", "DRAFT"].includes(normalized)) return "Unpublished";
  return "Published";
};

const ensureObjectId = (id: unknown, field: string) => {
  if (!id || !mongoose.isValidObjectId(id)) {
    throw new AppError(`Invalid ${field} id`, 400);
  }
  return new Types.ObjectId(String(id));
};

const buildSort = (sortParam?: unknown): Record<string, 1 | -1> => {
  const normalized = String(sortParam || "").toLowerCase().replace(/\s+/g, "_");
  if (["price_asc", "price_low_to_high", "low_to_high"].includes(normalized)) {
    return { priceMin: 1, createdAt: -1, _id: -1 };
  }
  if (["price_desc", "price_high_to_low", "high_to_low"].includes(normalized)) {
    return { priceMin: -1, createdAt: -1, _id: -1 };
  }
  if (["popular", "recommended", "relevance"].includes(normalized)) {
    return { ratingAvg: -1, salesCount: -1, createdAt: -1 };
  }
  return { createdAt: -1, _id: -1 };
};

const buildFilter = (query: Record<string, unknown>, role?: string) => {
  const filter: any = { isDeleted: { $ne: true } };
  const isAdmin = role && normalizeRole(role) === Roles.ADMIN;
  if (!(isAdmin && String(query.status || "").toLowerCase() === "all")) {
    filter.status = "Published";
  }

  const search = String(query.search || query.q || query.query || "").trim();
  if (search) filter.$text = { $search: search };

  const category = query.category || query.categories;
  if (category && mongoose.isValidObjectId(String(category))) {
    filter.category = new Types.ObjectId(String(category));
  }

  const brand = query.brand;
  if (brand && mongoose.isValidObjectId(String(brand))) {
    filter.brand = new Types.ObjectId(String(brand));
  }

  const minPrice = Number(query.priceMin || query.minPrice || query.min_price);
  const maxPrice = Number(query.priceMax || query.maxPrice || query.max_price);
  if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
    filter.priceMin = {};
    if (Number.isFinite(minPrice)) filter.priceMin.$gte = minPrice;
    if (Number.isFinite(maxPrice)) filter.priceMin.$lte = maxPrice;
  }

  return filter;
};

export const productService = {
  async list(query: Record<string, unknown>, role?: string) {
    const page = Math.max(parseInt(String(query.page || "1"), 10), 1);
    const limit = Math.min(Math.max(parseInt(String(query.limit || "25"), 10), 1), 100);
    const skip = (page - 1) * limit;
    const filter = buildFilter(query, role);
    const sort = buildSort(query.sort);

    const [products, total] = await Promise.all([
      productRepository.list(filter, sort, skip, limit),
      productRepository.count(filter),
    ]);

    return { products, total, page, perPage: limit, totalPages: Math.ceil(total / limit) };
  },

  async listRaw(query: Record<string, unknown>, role?: string) {
    const result = await this.list({ ...query, limit: query.limit || 100 }, role);
    return result.products;
  },

  async search(query: Record<string, unknown>, role?: string) {
    return this.list(query, role);
  },

  async getByIdOrSlug(idOrSlug: string) {
    const product = mongoose.isValidObjectId(idOrSlug)
      ? await productRepository.findById(idOrSlug)
      : await productRepository.findBySlug(idOrSlug);
    if (!product) throw new AppError("Product not found", 404);
    return product;
  },

  async create(payload: Record<string, unknown>, files: Express.Multer.File[] | undefined, userId?: string) {
    if (!payload.name) throw new AppError("name is required", 400);
    if (!payload.category) throw new AppError("category is required", 400);

    const seller = payload.seller || userId;
    if (!seller) throw new AppError("seller is required", 400);

    const uploaded = files?.map((file) => `/uploads/${file.filename}`) || [];
    const images = [...toStringArray(payload.images), ...uploaded];
    const variants = parseJson<any[]>(payload.variants, []);
    const hasVariants = Array.isArray(variants) && variants.length > 0;

    const product = await productRepository.create({
      name: String(payload.name).trim(),
      slug: generateSlug(String(payload.slug || payload.name)),
      description: String(payload.description || ""),
      feature: String(payload.feature || ""),
      brand: payload.brand ? ensureObjectId(payload.brand, "brand") : undefined,
      category: ensureObjectId(payload.category, "category"),
      seller: ensureObjectId(seller, "seller"),
      price: hasVariants ? undefined : toNumber(payload.price, 0),
      compareAtPrice: payload.compareAtPrice ? toNumber(payload.compareAtPrice) : undefined,
      currency: String(payload.currency || "USD").toUpperCase(),
      stock: hasVariants ? undefined : Math.max(0, toNumber(payload.stock, 0)),
      status: normalizeStatus(payload.status),
      tag: toStringArray(payload.tag),
      images,
      productType: String(payload.productType || ""),
      actualPrice: payload.actualPrice ? toNumber(payload.actualPrice) : undefined,
      dealerPrice: payload.dealerPrice ? toNumber(payload.dealerPrice) : undefined,
      attributes: parseJson<Record<string, string>>(payload.attributes, {}),
      variants,
      weight: payload.weight ? toNumber(payload.weight) : undefined,
      isAdult: payload.isAdult === "true" || payload.isAdult === true,
      isHazardous: payload.isHazardous === "true" || payload.isHazardous === true,
      dedupeKey: [
        String(payload.name).trim().toLowerCase(),
        String(payload.brand || "").trim().toLowerCase(),
        String(payload.category),
      ].join("|"),
    });

    return product;
  },

  async update(id: string, payload: Record<string, unknown>, files: Express.Multer.File[] | undefined) {
    const updates: Record<string, unknown> = { ...payload };
    if (payload.name !== undefined && payload.slug === undefined) {
      updates.slug = generateSlug(String(payload.name));
    }
    if (payload.slug !== undefined) updates.slug = generateSlug(String(payload.slug));
    if (payload.status !== undefined) updates.status = normalizeStatus(payload.status);
    if (payload.brand) updates.brand = ensureObjectId(payload.brand, "brand");
    if (payload.category) updates.category = ensureObjectId(payload.category, "category");
    if (payload.seller) updates.seller = ensureObjectId(payload.seller, "seller");
    if (payload.price !== undefined) updates.price = toNumber(payload.price);
    if (payload.stock !== undefined) updates.stock = Math.max(0, toNumber(payload.stock));
    if (payload.tag !== undefined) updates.tag = toStringArray(payload.tag);
    if (payload.attributes !== undefined) updates.attributes = parseJson<Record<string, string>>(payload.attributes, {});
    if (payload.variants !== undefined) updates.variants = parseJson<any[]>(payload.variants, []);

    const uploaded = files?.map((file) => `/uploads/${file.filename}`) || [];
    if (uploaded.length || payload.images !== undefined) {
      updates.images = [...toStringArray(payload.images), ...uploaded];
    }

    const product = await productRepository.update(id, updates);
    if (!product) throw new AppError("Product not found.", 404);
    return product;
  },

  async remove(id: string) {
    const product = await productRepository.softDelete(id);
    if (!product) throw new AppError("Product not found.", 404);
    return { msg: "Product deleted successfully." };
  },

  async removeMany(ids: string[]) {
    await Product.updateMany({ _id: { $in: ids } }, { isDeleted: true, deletedAt: new Date() });
    return { msg: "Products deleted successfully." };
  },

  async recommendations(id: string) {
    const product = await this.getByIdOrSlug(id);
    const related = await Product.find({
      _id: { $ne: product._id },
      category: (product as any).category?._id || (product as any).category,
      status: "Published",
      isDeleted: { $ne: true },
    })
      .limit(8)
      .lean();
    return { products: related };
  },
};
