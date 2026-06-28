import mongoose, { Types } from "mongoose";
import { AppError } from "@shared/errors/app-error";
import { generateSlug } from "@shared/utils/generateSlug";
import { normalizeRole, Roles } from "@shared/constants/roles";
import { getPagination, getPaginationMeta } from "@shared/utils/pagination";
import { productRepository } from "./product.repository";
import Product from "./product.model";
import { publishProductActivity } from "@services/inventory-service/src/modules/activity-logs/activity-log.publisher";
import { redis } from "@shared/infrastructure/redis/cache";

const toNumber = (value: unknown, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const toBoolean = (value: unknown, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return ["true", "1", "yes", "y"].includes(String(value).toLowerCase());
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
  if (["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"].includes(normalized)) return normalized;
  if (["UNPUBLISHED"].includes(normalized)) return "Unpublished";
  return "Published";
};

const normalizeProductType = (value: unknown) => {
  const normalized = String(value || "OTHER").toUpperCase();
  return ["PHONE", "LAPTOP", "COMPUTER", "TABLET", "ACCESSORY", "ELECTRONIC", "OTHER"].includes(normalized)
    ? normalized
    : "OTHER";
};

const normalizeTrackingType = (value: unknown) => {
  const normalized = String(value || "NONE").toUpperCase();
  return ["SERIAL", "BATCH", "NONE"].includes(normalized) ? normalized : "NONE";
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
    filter.status = { $in: ["Published", "ACTIVE"] };
  }

  const search = String(query.search || query.q || query.query || "").trim();
  if (search) filter.$text = { $search: search };

  const category = query.category || query.categoryId || query.categories;
  if (category && mongoose.isValidObjectId(String(category))) {
    filter.$and = [
      ...(filter.$and || []),
      {
        $or: [
          { category: new Types.ObjectId(String(category)) },
          { categoryId: new Types.ObjectId(String(category)) },
        ],
      },
    ];
  }

  const brand = query.brand || query.brandId;
  if (brand && mongoose.isValidObjectId(String(brand))) {
    filter.$and = [
      ...(filter.$and || []),
      {
        $or: [
          { brand: new Types.ObjectId(String(brand)) },
          { brandId: new Types.ObjectId(String(brand)) },
        ],
      },
    ];
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

const PRODUCT_CACHE_TTL = 300; // 5 minutes

const getListCacheKey = (query: Record<string, unknown>, role?: string) => {
  const sortedQuery: Record<string, any> = {};
  Object.keys(query).sort().forEach(key => {
    sortedQuery[key] = query[key];
  });
  return `products:list:role:${role || "public"}:query:${JSON.stringify(sortedQuery)}`;
};

async function safeGetCache(key: string): Promise<any | null> {
  try {
    if (redis.isOpen) {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    }
  } catch (error) {
    console.error(`[product-cache] Failed to get cache for key ${key}:`, error);
  }
  return null;
}

async function safeSetCache(key: string, value: any, ttl = PRODUCT_CACHE_TTL): Promise<void> {
  try {
    if (redis.isOpen) {
      await redis.set(key, JSON.stringify(value), { EX: ttl });
    }
  } catch (error) {
    console.error(`[product-cache] Failed to set cache for key ${key}:`, error);
  }
}

async function safeInvalidateProductCache(): Promise<void> {
  try {
    if (redis.isOpen) {
      const keys = await redis.keys("products:*");
      if (keys.length > 0) {
        await redis.del(keys);
      }
    }
  } catch (error) {
    console.error("[product-cache] Failed to invalidate product cache:", error);
  }
}

export const productService = {
  async list(query: Record<string, unknown>, role?: string) {
    const cacheKey = getListCacheKey(query, role);
    const cached = await safeGetCache(cacheKey);
    if (cached) {
      return cached;
    }

    const { page, limit, skip } = getPagination(query, { defaultLimit: 25, maxLimit: 100 });
    const filter = buildFilter(query, role);
    const sort = buildSort(query.sort);
    const includeTotal = toBoolean(query.includeTotal, true);
    const populate = toBoolean(query.populate, true);

    const productsPromise = productRepository.list(filter, sort, skip, limit, { populate });

    let result;
    if (!includeTotal) {
      const products = await productsPromise;
      result = {
        products,
        page,
        perPage: limit,
        hasMore: products.length === limit,
      };
    } else {
      const [products, total] = await Promise.all([
        productsPromise,
        productRepository.count(filter),
      ]);
      result = { products, ...getPaginationMeta(total, page, limit) };
    }

    await safeSetCache(cacheKey, result);
    return result;
  },

  async listRaw(query: Record<string, unknown>, role?: string) {
    const result = await this.list({ ...query, limit: query.limit || 100 }, role);
    return result.products;
  },

  async search(query: Record<string, unknown>, role?: string) {
    return this.list(query, role);
  },

  async getByIdOrSlug(idOrSlug: string) {
    const cacheKey = `products:detail:${idOrSlug}`;
    const cached = await safeGetCache(cacheKey);
    if (cached) {
      return cached;
    }

    const product = mongoose.isValidObjectId(idOrSlug)
      ? await productRepository.findById(idOrSlug)
      : await productRepository.findBySlug(idOrSlug);
    if (!product) throw new AppError("Product not found", 404);

    await safeSetCache(`products:detail:${product._id}`, product);
    await safeSetCache(`products:detail:${product.slug}`, product);
    return product;
  },

  async create(payload: Record<string, unknown>, files: Express.Multer.File[] | undefined, userId?: string) {
    if (!payload.name) throw new AppError("name is required", 400);
    const categoryInput = payload.category || payload.categoryId;
    if (!categoryInput) throw new AppError("category is required", 400);

    const seller = payload.seller || payload.createdBy || userId;
    if (!seller) throw new AppError("seller is required", 400);

    const uploaded = files?.map((file) => `/uploads/${file.filename}`) || [];
    const images = [...toStringArray(payload.images), ...uploaded];
    const variants = parseJson<any[]>(payload.variants, []);
    const hasVariants = Array.isArray(variants) && variants.length > 0;

    const brand = payload.brand || payload.brandId;
    const category = ensureObjectId(categoryInput, "category");
    const creator = ensureObjectId(seller, "seller");

    const product = await productRepository.create({
      productCode: payload.productCode || payload.productId,
      name: String(payload.name).trim(),
      slug: generateSlug(String(payload.slug || payload.name)),
      description: String(payload.description || ""),
      feature: String(payload.feature || ""),
      features: toStringArray(payload.features),
      brand: brand ? ensureObjectId(brand, "brand") : undefined,
      brandId: brand ? ensureObjectId(brand, "brand") : undefined,
      category,
      categoryId: category,
      seller: creator,
      createdBy: creator,
      price: hasVariants ? undefined : toNumber(payload.price, 0),
      compareAtPrice: payload.compareAtPrice ? toNumber(payload.compareAtPrice) : undefined,
      currency: String(payload.currency || "USD").toUpperCase(),
      stock: hasVariants ? undefined : Math.max(0, toNumber(payload.stock, 0)),
      status: normalizeStatus(payload.status),
      tag: toStringArray(payload.tag),
      tags: toStringArray(payload.tags || payload.tag),
      images,
      productType: normalizeProductType(payload.productType),
      trackingType: normalizeTrackingType(payload.trackingType),
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

    void publishProductActivity({
      action: "PRODUCT_CREATED",
      productId: String(product._id),
      userId,
    }).catch(console.error);

    await safeInvalidateProductCache();

    return product;
  },

  async update(id: string, payload: Record<string, unknown>, files: Express.Multer.File[] | undefined, userId?: string) {
    const updates: Record<string, unknown> = { ...payload };
    if (payload.name !== undefined && payload.slug === undefined) {
      updates.slug = generateSlug(String(payload.name));
    }
    if (payload.slug !== undefined) updates.slug = generateSlug(String(payload.slug));
    if (payload.status !== undefined) updates.status = normalizeStatus(payload.status);
    if (payload.brand || payload.brandId) {
      updates.brand = ensureObjectId(payload.brand || payload.brandId, "brand");
      updates.brandId = updates.brand;
    }
    if (payload.category || payload.categoryId) {
      updates.category = ensureObjectId(payload.category || payload.categoryId, "category");
      updates.categoryId = updates.category;
    }
    if (payload.seller || payload.createdBy) {
      updates.seller = ensureObjectId(payload.seller || payload.createdBy, "seller");
      updates.createdBy = updates.seller;
    }
    if (payload.price !== undefined) updates.price = toNumber(payload.price);
    if (payload.stock !== undefined) updates.stock = Math.max(0, toNumber(payload.stock));
    if (payload.tag !== undefined) updates.tag = toStringArray(payload.tag);
    if (payload.tags !== undefined) updates.tags = toStringArray(payload.tags);
    if (payload.features !== undefined) updates.features = toStringArray(payload.features);
    if (payload.attributes !== undefined) updates.attributes = parseJson<Record<string, string>>(payload.attributes, {});
    if (payload.variants !== undefined) updates.variants = parseJson<any[]>(payload.variants, []);
    if (payload.productType !== undefined) updates.productType = normalizeProductType(payload.productType);
    if (payload.trackingType !== undefined) updates.trackingType = normalizeTrackingType(payload.trackingType);
    if (payload.productCode !== undefined) updates.productCode = String(payload.productCode);

    const uploaded = files?.map((file) => `/uploads/${file.filename}`) || [];
    if (uploaded.length || payload.images !== undefined) {
      updates.images = [...toStringArray(payload.images), ...uploaded];
    }

    const product = await productRepository.update(id, updates);
    if (!product) throw new AppError("Product not found.", 404);
    void publishProductActivity({
      action: "PRODUCT_UPDATED",
      productId: String((product as any)._id || id),
      userId,
    }).catch(console.error);

    await safeInvalidateProductCache();

    return product;
  },

  async remove(id: string, userId?: string) {
    const product = await productRepository.softDelete(id);
    if (!product) throw new AppError("Product not found.", 404);
    void publishProductActivity({
      action: "PRODUCT_DELETED",
      productId: String((product as any)._id || id),
      userId,
    }).catch(console.error);

    await safeInvalidateProductCache();

    return { msg: "Product deleted successfully." };
  },

  async removeMany(ids: string[], userId?: string) {
    await Product.updateMany({ _id: { $in: ids } }, { isDeleted: true, deletedAt: new Date() });
    void publishProductActivity({
      action: "PRODUCT_DELETED",
      productIds: ids.map(String),
      userId,
    }).catch(console.error);

    await safeInvalidateProductCache();

    return { msg: "Products deleted successfully." };
  },

  async recommendations(id: string) {
    const cacheKey = `products:recommendations:${id}`;
    const cached = await safeGetCache(cacheKey);
    if (cached) {
      return cached;
    }

    const product = await this.getByIdOrSlug(id);
    const related = await Product.find({
      _id: { $ne: product._id },
      category: (product as any).category?._id || (product as any).category,
      status: "Published",
      isDeleted: { $ne: true },
    })
      .select("name slug images primaryImageIndex price priceMin priceMax currency ratingAvg category brand createdAt")
      .limit(8)
      .lean({ virtuals: true });
    
    const result = { products: related };
    await safeSetCache(cacheKey, result);
    return result;
  },
};
