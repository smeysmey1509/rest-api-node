import mongoose, { Types } from "mongoose";

const slugify = (s: string) =>
  String(s || "")
    .toLowerCase()
    .trim()
    .replace(/['\"]/g, "")
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
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function parseTags(input: unknown): string[] {
  if (Array.isArray(input))
    return [...new Set(input.map((t) => String(t).trim()).filter(Boolean))];
  if (typeof input === "string") {
    const json = parseJSON<string[]>(input, []);
    if (json.length)
      return [...new Set(json.map((t) => t.trim()).filter(Boolean))];
    return [...new Set(input.split(",").map((t) => t.trim()).filter(Boolean))];
  }
  return [];
}

function ensureObjectId(id: any, field: string): Types.ObjectId {
  if (!id || !mongoose.isValidObjectId(id)) {
    throw new Error(`Invalid ${field} id`);
  }
  return new Types.ObjectId(String(id));
}

export type InputVariant = {
  sku: string;
  price: number | string;
  stock?: number | string;
  attributes?: Record<string, string>;
  images?: string[];
  isActive?: boolean;
  inventory?: {
    onHand?: number | string;
    reserved?: number | string;
    safetyStock?: number | string;
  };
};

function normalizeAttributes(raw: unknown): Record<string, string> {
  const obj = parseJSON<Record<string, string>>(raw, {});
  const clean: Record<string, string> = {};
  for (const [k, val] of Object.entries(obj)) {
    clean[String(k)] = String(val);
  }
  return clean;
}

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

function normalizeSeo(
  raw: unknown
): { title?: string; description?: string; keywords?: string[] } | undefined {
  const seo = parseJSON<any>(raw, undefined as any);
  if (!seo) return undefined;
  const keywords = Array.isArray(seo.keywords)
    ? seo.keywords.map((k: any) => String(k))
    : typeof seo.keywords === "string" && seo.keywords.trim()
    ? seo.keywords.split(",").map((k: string) => k.trim())
    : [];
  return {
    title: typeof seo.title === "string" ? seo.title : "",
    description:
      typeof seo.description === "string" ? seo.description : "",
    keywords,
  };
}

function normalizeDimensions(raw: unknown) {
  const dims = parseJSON<{ length?: any; width?: any; height?: any }>(
    raw,
    undefined as any
  );
  if (
    !dims ||
    (!Number.isFinite(Number(dims.length)) &&
      !Number.isFinite(Number(dims.width)) &&
      !Number.isFinite(Number(dims.height)))
  ) {
    return undefined;
  }
  return {
    length: toNumber(dims.length, 0),
    width: toNumber(dims.width, 0),
    height: toNumber(dims.height, 0),
  };
}

function buildDedupeKey(
  name: string,
  brandId: Types.ObjectId | undefined,
  categoryId: Types.ObjectId
): string {
  return [
    String(name || "").trim().toLowerCase(),
    String(brandId || "").trim().toLowerCase(),
    String(categoryId),
  ].join("|");
}

export {
  slugify,
  toNumber,
  parseJSON,
  parseTags,
  ensureObjectId,
  normalizeVariants,
  normalizeAttributes,
  normalizeSeo,
  normalizeDimensions,
  buildDedupeKey,
};