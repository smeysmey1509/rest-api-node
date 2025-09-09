// src/main/controllers/product/createProduct.controller.ts
import { Response } from "express";
import mongoose, { Types } from "mongoose";
import Product from "../../../models/Product";
import { AuthenicationRequest } from "../../../middleware/auth";
import { io } from "../../server";
import { publishNotificationEvent } from "../../services/notification.service"

/** ---------------- helpers ---------------- */
const slugify = (s: string) =>
  String(s || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function toNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parseJSON<T>(v: unknown, fallback: T): T {
  if (v == null) return fallback;
  if (typeof v === "object") return v as T;
  if (typeof v === "string" && v.trim().length) {
    try { return JSON.parse(v) as T; } catch { return fallback; }
  }
  return fallback;
}

function parseTags(input: unknown): string[] {
  if (Array.isArray(input)) return [...new Set(input.map((t) => String(t).trim()).filter(Boolean))];
  if (typeof input === "string") {
    const json = parseJSON<string[]>(input, []);
    if (json.length) return [...new Set(json.map((t) => t.trim()).filter(Boolean))];
    return [...new Set(input.split(",").map((t) => t.trim()).filter(Boolean))];
  }
  return [];
}

function ensureObjectId(id: any, field: string): Types.ObjectId {
  if (!id || !mongoose.isValidObjectId(id)) throw new Error(`Invalid ${field} id`);
  return new Types.ObjectId(String(id));
}

/** variants normalization */
type InputVariant = {
  sku: string;
  price: number | string;
  stock?: number | string;
  attributes?: Record<string, string>;
  images?: string[];
  isActive?: boolean;
  inventory?: { onHand?: number | string; reserved?: number | string; safetyStock?: number | string };
};

function normalizeVariants(raw: unknown): any[] {
  const arr = parseJSON<InputVariant[]>(raw, []);
  const list = Array.isArray(arr) ? arr : Object.values(arr as any);

  return list
    .map((v: any) => {
      const price = toNumber(v.price, 0);
      const stock = toNumber(v.stock, 0);
      const inv = v.inventory
        ? {
            onHand: toNumber(v.inventory.onHand, stock || 0),
            reserved: toNumber(v.inventory.reserved, 0),
            safetyStock: toNumber(v.inventory.safetyStock, 0),
          }
        : { onHand: stock || 0, reserved: 0, safetyStock: 0 };

      const attrsObj = normalizeAttributes(v.attributes);
      const attrsMap = new Map(Object.entries(attrsObj));

      return {
        sku: String(v.sku || "").trim(),
        price,
        stock,
        inventory: inv,
        attributes: attrsMap,
        images: Array.isArray(v.images) ? v.images : [],
        isActive: v.isActive !== false,
      };
    })
    .filter((v) => v.sku && Number.isFinite(v.price));
}

function normalizeAttributes(raw: unknown): Record<string, string> {
  const obj = parseJSON<Record<string, string>>(raw, {});
  const clean: Record<string, string> = {};
  for (const [k, val] of Object.entries(obj)) clean[String(k)] = String(val);
  return clean;
}

function normalizeSeo(
  raw: unknown
): { title?: string; description?: string; keywords?: string[] } | undefined {
  const seo = parseJSON<any>(raw, undefined as any);
  if (!seo) return undefined;
  const keywords =
    Array.isArray(seo.keywords)
      ? seo.keywords.map((k: any) => String(k))
      : typeof seo.keywords === "string" && seo.keywords.trim()
      ? seo.keywords.split(",").map((k: string) => k.trim())
      : [];
  return {
    title: typeof seo.title === "string" ? seo.title : "",
    description: typeof seo.description === "string" ? seo.description : "",
    keywords,
  };
}

/** ---------------- controller ---------------- */
export const createProduct = async (req: AuthenicationRequest, res: Response) => {
  try {
    const {
      name,
      slug,
      description,
      brand,
      price,
      compareAtPrice,
      currency,
      stock,
      status,
      category,
      seller,
      tag,
      attributes,
      variants,
      dimensions,
      weight,
      seo,
      isAdult,
      isHazardous,
    } = req.body;

    if (!name)    { res.status(400).json({ error: "name is required" }); return; }
    if (!category){ res.status(400).json({ error: "category is required" }); return; }
    if (!seller)  { res.status(400).json({ error: "seller is required" }); return; }

    const categoryId = ensureObjectId(category, "category");
    const sellerId   = ensureObjectId(seller, "seller");
    const brandId   = brand ? ensureObjectId(brand, "brand") : undefined;

    // Canonical identifiers (match schema)
    const canonicalSlug = slug ? slugify(slug) : slugify(name);
    const dedupeKey = [
      String(name).trim().toLowerCase(),
      String(brand || "").trim().toLowerCase(),
      String(categoryId),
    ].join("|");

    // Images (Multer + optional body URLs)
    const files = req.files as Express.Multer.File[] | undefined;
    const uploaded = files?.length ? files.map((f) => `/uploads/${f.filename}`) : [];
    const imageUrls: string[] = Array.isArray(req.body.images)
      ? (req.body.images as string[]).concat(uploaded)
      : uploaded;

    const normTags     = parseTags(tag);
    const normVariants = normalizeVariants(variants);
    const normAttrs    = normalizeAttributes(attributes);
    const normSeo      = normalizeSeo(seo);

    const dimsObj = parseJSON<{ length?: any; width?: any; height?: any }>(dimensions, undefined as any);
    const dims =
      dimsObj && (dimsObj.length || dimsObj.width || dimsObj.height)
        ? {
            length: toNumber(dimsObj.length, 0),
            width: toNumber(dimsObj.width, 0),
            height: toNumber(dimsObj.height, 0),
          }
        : undefined;

    // If variants exist, don't accept top-level price/stock (avoid redundancy drift)
    const topLevelPrice = Array.isArray(normVariants) && normVariants.length ? undefined : toNumber(price, 0);
    const topLevelStock = Array.isArray(normVariants) && normVariants.length ? undefined : toNumber(stock, 0);

    // normalize optional compare-at price
    const rawCompare = compareAtPrice != null ? toNumber(compareAtPrice, NaN) : NaN;
    const normCompareAtPrice = Number.isFinite(rawCompare) && rawCompare > 0 ? rawCompare : undefined;

    // ---------- STRICT DUP CHECKS ----------
    // A) Slug or dedupeKey already exists for this seller?
    const slugOrKey = await Product.findOne({
      seller: sellerId,
      isDeleted: { $ne: true },
      $or: [{ slug: canonicalSlug }, { dedupeKey }],
    })
      .collation({ locale: "en", strength: 2 })
      .select("_id slug")
      .lean();

    if (slugOrKey) {
      res.status(409).json({
        error: "Duplicate product",
        details: { conflictOn: slugOrKey.slug === canonicalSlug ? "slug" : "dedupeKey" },
      });
      return;
    }

    // B) Any incoming variant SKU already taken by this seller?
    if (normVariants.length) {
      const incomingSkus = normVariants.map((v) => v.sku);
      const skuConflict = await Product.findOne({
        seller: sellerId,
        isDeleted: { $ne: true },
        "variants.sku": { $in: incomingSkus },
      })
        .select("_id")
        .lean();

      if (skuConflict) {
        res.status(409).json({
          error: "Duplicate SKU",
          details: { skus: incomingSkus },
        });
        return;
      }
    }
    // ---------- END DUP CHECKS ----------

    const productDoc = await Product.create({
      name: String(name).trim(),
      slug: canonicalSlug,
      description: typeof description === "string" ? description : "",
      currency: typeof currency === "string" && currency.length ? currency.toUpperCase() : "USD",

      ...(topLevelPrice !== undefined ? { price: topLevelPrice } : {}),
      ...(topLevelStock !== undefined ? { stock: topLevelStock } : {}),
      ...(normCompareAtPrice !== undefined ? { compareAtPrice: normCompareAtPrice } : {}),

      category: categoryId,
      seller: sellerId,
      brand: brandId,
      status: status === "Unpublished" ? "Unpublished" : "Published",
      tag: normTags,

      images: imageUrls,
      primaryImageIndex: 0,

      ratingAvg: 0,
      ratingCount: 0,
      salesCount: 0,
      isTrending: false,

      attributes: normAttrs,
      variants: normVariants,
      dimensions: dims,
      weight: weight != null ? toNumber(weight, 0) : 0,
      seo: normSeo,

      isAdult: isAdult === true || isAdult === "true",
      isHazardous: isHazardous === true || isHazardous === "true",

      dedupeKey,
    });

    // events
    const userInputId = req?.user?.id;
    await publishNotificationEvent({
      userId: userInputId,
      title: "Created Product",
      message: `Product ${productDoc.name} has been created.`,
      read: false,
    });
    io.emit("product:created", String(productDoc._id));

    res.status(201).json({
      msg: `Product ${productDoc.name} has been created.`,
    });
  } catch (err: any) {
    if (err?.code === 11000) {
      // unique index collision: (seller, slug) / (seller, dedupeKey) / (seller, variants.sku)
      res.status(409).json({ error: "Duplicate key", details: err.keyValue });
      return;
    }
    console.error("Error creating product:", err?.message, err?.stack);
    res.status(400).json({ error: "Failed to create product." });
  }
};
