// src/main/controllers/product/createProduct.controller.ts
import { Response } from "express";
import mongoose, { Types } from "mongoose";
import Product from "../../../models/Product";
import { AuthenicationRequest } from "../../../middleware/auth";
import { io } from "../../server";
import { publishNotificationEvent } from "../../services/notification.service";

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
  return arr
    .map((v) => {
      const price = toNumber(v.price, 0);
      const stock = toNumber(v.stock, 0);
      const inv = v.inventory
        ? {
            onHand: toNumber(v.inventory.onHand, stock || 0),
            reserved: toNumber(v.inventory.reserved, 0),
            safetyStock: toNumber(v.inventory.safetyStock, 0),
          }
        : { onHand: stock || 0, reserved: 0, safetyStock: 0 };
      return {
        sku: String(v.sku || "").trim(),
        price,
        stock, // kept for legacy compatibility with schema
        inventory: inv,
        attributes: v.attributes || {},
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

    if (!name)   { res.status(400).json({ error: "name is required" }); return; }
    if (!category) { res.status(400).json({ error: "category is required" }); return; }
    if (!seller)   { res.status(400).json({ error: "seller is required" }); return; }

    const categoryId = ensureObjectId(category, "category");
    const sellerId   = ensureObjectId(seller, "seller");

    // Canonical identifiers
    const canonicalSlug = slug ? slugify(slug) : slugify(name);

    // dedupeKey: (name, brand, category) normalized — must match schema logic
    const dedupeKey = [
      String(name).trim().toLowerCase(),
      String(brand || "").trim().toLowerCase(),
      String(categoryId),
    ].join("|");

    // Images from Multer + optional body images
    const files = req.files as Express.Multer.File[] | undefined;
    const uploaded = files?.length ? files.map((f) => `/uploads/${f.filename}`) : [];
    const imageUrls: string[] = Array.isArray(req.body.images)
      ? (req.body.images as string[]).concat(uploaded)
      : uploaded;

    const normTags     = parseTags(tag);
    const normVariants = normalizeVariants(variants);
    const normAttrs    = normalizeAttributes(attributes);
    const normSeo      = normalizeSeo(seo);

    const dimsObj = parseJSON<{ length?: any; width?: any; height?: any }>(
      dimensions,
      undefined as any
    );
    const dims =
      dimsObj && (dimsObj.length || dimsObj.width || dimsObj.height)
        ? {
            length: toNumber(dimsObj.length, 0),
            width: toNumber(dimsObj.width, 0),
            height: toNumber(dimsObj.height, 0),
          }
        : undefined;

    // If variants are provided, ignore incoming top-level price/stock (will be derived by hooks)
    const topLevelPrice = Array.isArray(normVariants) && normVariants.length ? undefined : toNumber(price, 0);
    const topLevelStock = Array.isArray(normVariants) && normVariants.length ? undefined : toNumber(stock, 0);

    const baseDoc: any = {
      name: String(name).trim(),
      slug: canonicalSlug,
      description: typeof description === "string" ? description : "",
      brand: typeof brand === "string" ? brand : "",
      currency: typeof currency === "string" && currency.length ? currency.toUpperCase() : "USD",

      // legacy top-level; omitted when variants exist
      ...(topLevelPrice !== undefined ? { price: topLevelPrice } : {}),
      ...(topLevelStock !== undefined ? { stock: topLevelStock } : {}),
      compareAtPrice: compareAtPrice != null ? toNumber(compareAtPrice, 0) : undefined,

      category: categoryId,
      seller: sellerId,
      status: status === "Unpublished" ? "Unpublished" : "Published",
      tag: normTags,

      images: imageUrls,
      primaryImageIndex: 0,

      // analytics defaults
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

      dedupeKey, // used by unique index & duplicate detection
    };

    // ---- Duplicate handling: strict (409) vs upsert (200/201) ----
    const upsert = req.query.upsert === "true";

    if (!upsert) {
      // Strict: pre-check duplicates by (seller, slug) OR (seller, dedupeKey)
      const existing = await Product.findOne({
        seller: sellerId,
        $or: [{ slug: canonicalSlug }, { dedupeKey }],
        isDeleted: { $ne: true },
      })
        .collation({ locale: "en", strength: 2 })
        .select("_id slug")
        .lean();

      if (existing) {
        res.status(409).json({
          error: "Duplicate product",
          details: { conflictOn: existing.slug === canonicalSlug ? "slug" : "dedupeKey" },
        });
        return;
      }

      const productDoc = await Product.create(baseDoc);

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
        msg: "Product created.",
        product: productDoc.toObject({ virtuals: true }),
      });
      return;
    }

    // Upsert mode: create if absent, otherwise return the existing document
    const productDoc = await Product.findOneAndUpdate(
      { seller: sellerId, $or: [{ slug: canonicalSlug }, { dedupeKey }], isDeleted: { $ne: true } },
      { $setOnInsert: baseDoc },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        runValidators: true,
        context: "query",
        collation: { locale: "en", strength: 2 },
      }
    );

    // crude created vs existing signal: if just inserted, createdAt ~ updatedAt on first save
    const created = productDoc.createdAt?.toString() === productDoc.updatedAt?.toString();

    if (created) {
      const userInputId = req?.user?.id;
      await publishNotificationEvent({
        userId: userInputId,
        title: "Created Product",
        message: `Product ${productDoc.name} has been created.`,
        read: false,
      });
      io.emit("product:created", String(productDoc._id));
    }

    res.status(created ? 201 : 200).json({
      msg: created ? "Product created." : "Product already exists.",
      product: productDoc.toObject({ virtuals: true }),
    });
  } catch (err: any) {
    if (err?.code === 11000) {
      // unique index collision: (seller, slug) or (seller, dedupeKey) or (seller, variants.sku)
      res.status(409).json({ error: "Duplicate key", details: err.keyValue });
      return;
    }
    console.error("Error creating product:", err?.message, err?.stack);
    res.status(400).json({ error: "Failed to create product." });
  }
};
