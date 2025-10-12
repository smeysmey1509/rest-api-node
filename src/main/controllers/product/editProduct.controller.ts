import { AuthenicationRequest } from "../../../middleware/auth";
import { Response } from "express";
import { HydratedDocument } from "mongoose";
import Product, { IProduct } from "../../../models/Product";
import { publishProductActivity } from "../../services/activity.service";
import { io } from "../../server";
import { publishNotificationEvent } from "../../services/notification.service";
import {
  buildDedupeKey,
  ensureObjectId,
  normalizeAttributes,
  normalizeDimensions,
  normalizeSeo,
  normalizeVariants,
  parseJSON,
  parseTags,
  slugify,
  toNumber,
} from "../../utils/productNormalization";

function detectChangedFieldsSummary(original: any, updates: any): string {
  const changes: string[] = [];

  for (const key in updates) {
    let oldValue = original[key];
    let newValue = updates[key];

    // Convert arrays to comma-separated strings
    if (Array.isArray(oldValue)) {
      oldValue = oldValue.join(",");
    }
    if (Array.isArray(newValue)) {
      newValue = newValue.join(",");
    }

    // Convert objects to their 'name' if exists or stringify them
    if (typeof oldValue === "object" && oldValue !== null) {
      oldValue = oldValue.name || JSON.stringify(oldValue);
    }
    if (typeof newValue === "object" && newValue !== null) {
      newValue = newValue.name || JSON.stringify(newValue);
    }

    if (oldValue !== newValue) {
      changes.push(`${key}: "${oldValue}" → "${newValue}"`);
    }
  }

  if (changes.length === 0) {
    return "No changes detected.";
  }

  return "Changes: " + changes.join(", ");
}

const hasOwn = (obj: Record<string, any>, key: string) =>
  Object.prototype.hasOwnProperty.call(obj, key);

const normalizeBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const lowered = value.toLowerCase();
    if (["true", "1", "yes", "on"].includes(lowered)) return true;
    if (["false", "0", "no", "off"].includes(lowered)) return false;
  }
  return undefined;
};

const dedupeStringArray = (values: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of values) {
    const str = String(raw ?? "").trim();
    if (!str.length || seen.has(str)) continue;
    seen.add(str);
    result.push(str);
  }

  return result;
};

const toImageArray = (input: unknown): string[] => {
  if (Array.isArray(input)) {
    return dedupeStringArray(input.map((img) => String(img)));
  }

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed.length) return [];

    const parsed = parseJSON<string[]>(trimmed, []);
    if (Array.isArray(parsed) && parsed.length) {
      return dedupeStringArray(parsed.map((img) => String(img)));
    }
    if (
      trimmed.includes(",") &&
      !trimmed.includes("://") &&
      !/^data:/i.test(trimmed)
    ) {
      const splitted = trimmed.split(",").map((img) => img.trim());
      return dedupeStringArray(splitted);
    }

    return dedupeStringArray([trimmed]);
  }
  return [];
};

const areStringArraysEqual = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
};

const prepareVariantSummary = (variants: any[]) =>
  variants.map((variant) => ({
    sku: variant.sku,
    price: variant.price,
    stock: variant.stock,
    inventory: variant.inventory,
    attributes: Object.fromEntries(variant.attributes ?? []),
    images: variant.images,
    isActive: variant.isActive,
  }));

export const editProduct = async (
  req: AuthenicationRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body ?? {};

    // 🔹 Parse JSON strings when sent via form-data
    const parseIfJson = (value: any) => {
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return value;
    };

    // Parse these fields if they come in as JSON text
    ["variants", "attributes", "seo", "dimensions", "tag"].forEach((field) => {
      if (hasOwn(body, field)) {
        body[field] = parseIfJson(body[field]);
      }
    });

    if (!hasOwn(body, "variants")) {
      if (hasOwn(body, "variant")) {
        body.variants = body.variant;
      } else if (hasOwn(body, "varaint")) {
        body.variants = body.varaint;
      }
    }
    const userId = req.user?.id;
    const rawFiles = req.files;
    const files: Express.Multer.File[] = Array.isArray(rawFiles)
      ? rawFiles
      : rawFiles && typeof rawFiles === "object"
      ? Object.values(rawFiles).reduce<Express.Multer.File[]>((acc, value) => {
          if (Array.isArray(value)) {
            acc.push(...value);
          }
          return acc;
        }, [])
      : [];
    const uploadedImagePaths = files.map((file) => `/uploads/${file.filename}`);

    const productDoc = await Product.findById(id);

    if (!productDoc) {
      res.status(404).json({ msg: "Product not found" });
      return;
    }

    const originalPrimaryImageIndex = productDoc.primaryImageIndex ?? 0;

    const originalProduct = productDoc.toObject({
      depopulate: true,
      flattenMaps: true,
    });

    if (!originalProduct) {
      res.status(404).json({ msg: "Product not found after update" });
      return;
    }

    const updatesForSummary: Record<string, any> = {};

    let sellerId = productDoc.seller;
    if (hasOwn(body, "seller")) {
      const newSeller = ensureObjectId(body.seller, "seller");
      if (String(newSeller) !== String(productDoc.seller)) {
        productDoc.seller = newSeller as any;
        updatesForSummary.seller = String(newSeller);
      }
      sellerId = productDoc.seller;
    }

    let categoryId: any = productDoc.category;
    if (hasOwn(body, "category")) {
      const newCategory = ensureObjectId(body.category, "category");
      if (String(newCategory) !== String(productDoc.category)) {
        productDoc.category = newCategory as any;
        updatesForSummary.category = String(newCategory);
      }
      categoryId = productDoc.category;
    }

    if (!categoryId) {
      res.status(400).json({ error: "category is required" });
      return;
    }
    if (hasOwn(body, "brand")) {
      const newBrand = body.brand
        ? ensureObjectId(body.brand, "brand")
        : undefined;
      if (String(newBrand || "") !== String(productDoc.brand || "")) {
        productDoc.brand = newBrand as any;
        updatesForSummary.brand = newBrand ? String(newBrand) : undefined;
      }
    }

    if (hasOwn(body, "name")) {
      const trimmed = String(body.name || "").trim();
      if (!trimmed) {
        res.status(400).json({ error: "name is required" });
        return;
      }
      if (trimmed !== productDoc.name) {
        productDoc.name = trimmed;
        updatesForSummary.name = trimmed;
      }
    }

    if (hasOwn(body, "description")) {
      const description =
        typeof body.description === "string" ? body.description : "";
      if (description !== productDoc.description) {
        productDoc.description = description;
        updatesForSummary.description = description;
      }
    }

    if (hasOwn(body, "currency")) {
      const currency =
        typeof body.currency === "string" && body.currency.trim().length
          ? body.currency.trim().toUpperCase()
          : productDoc.currency;
      if (currency && currency !== productDoc.currency) {
        productDoc.currency = currency;
        updatesForSummary.currency = currency;
      }
    }

    if (hasOwn(body, "status")) {
      const status =
        body.status === "Unpublished" ? "Unpublished" : "Published";
      if (status !== productDoc.status) {
        productDoc.status = status;
        updatesForSummary.status = status;
      }
    }

    if (hasOwn(body, "slug")) {
      const rawSlug = String(body.slug || "").trim();
      const newSlug = rawSlug.length
        ? slugify(rawSlug)
        : slugify(productDoc.name);
      if (!newSlug) {
        res.status(400).json({ error: "slug must not be empty" });
        return;
      }
      if (newSlug !== productDoc.slug) {
        productDoc.slug = newSlug;
        updatesForSummary.slug = newSlug;
      }
    }

    if (hasOwn(body, "tag")) {
      const tags = parseTags(body.tag);
      productDoc.tag = tags;
      updatesForSummary.tag = tags;
    }

    if (hasOwn(body, "attributes")) {
      const attrs = normalizeAttributes(body.attributes);
      productDoc.set("attributes", attrs);
      updatesForSummary.attributes = attrs;
    }

    let variantsForDoc: any[] | undefined;
    if (hasOwn(body, "variants")) {
      const incomingVariants = Array.isArray(body.variants)
        ? body.variants
        : [body.variants];

      const existingVariants = productDoc.variants ?? [];

      // ✅ Merge incoming variants into existing ones
      const updatedVariants = existingVariants.map((variant: any) => {
        const match = incomingVariants.find(
          (v: any) => v._id === String(variant._id) || v.sku === variant.sku
        );
        return match
          ? { ...(variant.toObject?.() ?? variant), ...match }
          : variant;
      });

      // ✅ Add new variants if any don’t exist yet
      const newOnes = incomingVariants.filter(
        (v: any) =>
          !existingVariants.some(
            (ex: any) => String(ex._id) === String(v._id) || ex.sku === v.sku
          )
      );

      const mergedVariants = [...updatedVariants, ...newOnes];

      productDoc.variants = mergedVariants as any;
      updatesForSummary.variants = prepareVariantSummary(mergedVariants);

      // Clear top-level price/stock when using variants
      if (mergedVariants.length) {
        productDoc.set("price", undefined);
        productDoc.set("stock", undefined);
      }
    }

    if (hasOwn(body, "price") && !variantsForDoc?.length) {
      const raw = body.price;
      if (raw === null || raw === "") {
        if (productDoc.price !== undefined) {
          productDoc.set("price", undefined);
          updatesForSummary.price = undefined;
        }
      } else {
        const priceVal = toNumber(raw, NaN);
        if (!Number.isFinite(priceVal) || priceVal < 0) {
          res
            .status(400)
            .json({ error: "price must be a non-negative number" });
          return;
        }
        if (productDoc.price !== priceVal) {
          productDoc.price = priceVal;
          updatesForSummary.price = priceVal;
        }
      }
    }

    if (hasOwn(body, "cost")) {
      const raw = body.cost;
      if (raw === null || raw === "") {
        if (productDoc.cost !== undefined) {
          productDoc.set("cost", undefined);
          updatesForSummary.cost = undefined;
        }
      } else {
        const costVal = toNumber(raw, NaN);
        if (!Number.isFinite(costVal) || costVal < 0) {
          res.status(400).json({ error: "cost must be a non-negative number" });
          return;
        }
        if (productDoc.cost !== costVal) {
          productDoc.cost = costVal;
          updatesForSummary.cost = costVal;
        }
      }
    }

    if (hasOwn(body, "stock") && !variantsForDoc?.length) {
      const raw = body.stock;
      if (raw === null || raw === "") {
        if (productDoc.stock !== undefined) {
          productDoc.set("stock", undefined);
          updatesForSummary.stock = undefined;
        }
      } else {
        const stockVal = Math.max(0, Math.floor(toNumber(raw, 0)));
        if (productDoc.stock !== stockVal) {
          productDoc.stock = stockVal;
          updatesForSummary.stock = stockVal;
        }
      }
    }

    if (hasOwn(body, "compareAtPrice")) {
      const raw = body.compareAtPrice;
      if (raw === null || raw === "") {
        if (productDoc.compareAtPrice !== undefined) {
          productDoc.set("compareAtPrice", undefined);
          updatesForSummary.compareAtPrice = undefined;
        }
      } else {
        const compareVal = toNumber(raw, NaN);
        if (!Number.isFinite(compareVal) || compareVal < 0) {
          res
            .status(400)
            .json({ error: "compareAtPrice must be a non-negative number" });
          return;
        }
        if (productDoc.compareAtPrice !== compareVal) {
          productDoc.compareAtPrice = compareVal;
          updatesForSummary.compareAtPrice = compareVal;
        }
      }
    }

    if (hasOwn(body, "dimensions")) {
      const dims = normalizeDimensions(body.dimensions);
      productDoc.dimensions = dims as any;
      updatesForSummary.dimensions = dims;
    }

    if (hasOwn(body, "weight")) {
      const weight = toNumber(body.weight, 0);
      if (productDoc.weight !== weight) {
        productDoc.weight = weight;
        updatesForSummary.weight = weight;
      }
    }

    if (hasOwn(body, "seo")) {
      const seo = normalizeSeo(body.seo);
      if (seo) {
        productDoc.seo = seo as any;
        updatesForSummary.seo = seo;
      } else {
        productDoc.set("seo", { title: "", description: "", keywords: [] });
        updatesForSummary.seo = productDoc.seo;
      }
    }

    if (hasOwn(body, "isAdult")) {
      const bool = normalizeBoolean(body.isAdult);
      if (bool !== undefined && bool !== productDoc.isAdult) {
        productDoc.isAdult = bool;
        updatesForSummary.isAdult = bool;
      }
    }

    if (hasOwn(body, "isHazardous")) {
      const bool = normalizeBoolean(body.isHazardous);
      if (bool !== undefined && bool !== productDoc.isHazardous) {
        productDoc.isHazardous = bool;
        updatesForSummary.isHazardous = bool;
      }
    }

    if (hasOwn(body, "images") || uploadedImagePaths.length) {
      const existingImages = Array.isArray(productDoc.images)
        ? productDoc.images.map((img) => String(img))
        : [];
      const baseImages = hasOwn(body, "images")
        ? toImageArray(body.images)
        : existingImages;
      const combinedImages = dedupeStringArray([
        ...baseImages,
        ...uploadedImagePaths,
      ]);

      if (!areStringArraysEqual(combinedImages, existingImages)) {
        productDoc.images = combinedImages;
        updatesForSummary.images = combinedImages;

        const nextPrimaryIndex = combinedImages.length
          ? Math.min(originalPrimaryImageIndex, combinedImages.length - 1)
          : 0;

        if (nextPrimaryIndex !== productDoc.primaryImageIndex) {
          productDoc.primaryImageIndex = nextPrimaryIndex;
          updatesForSummary.primaryImageIndex = nextPrimaryIndex;
        }
      }
    }

    if (hasOwn(body, "primaryImageIndex")) {
      const idx = Math.max(0, Math.floor(toNumber(body.primaryImageIndex, 0)));
      const totalImages = Array.isArray(productDoc.images)
        ? productDoc.images.length
        : 0;
      const safeIdx = totalImages ? Math.min(idx, totalImages - 1) : 0;
      if (safeIdx !== productDoc.primaryImageIndex) {
        productDoc.primaryImageIndex = safeIdx;
        updatesForSummary.primaryImageIndex = safeIdx;
      }
    }

    if (hasOwn(body, "isTrending")) {
      const bool = normalizeBoolean(body.isTrending);
      if (bool !== undefined && bool !== productDoc.isTrending) {
        productDoc.isTrending = bool as any;
        updatesForSummary.isTrending = bool;
      }
    }

    const canonicalSlug = productDoc.slug
      ? slugify(productDoc.slug)
      : slugify(productDoc.name);

    if (canonicalSlug !== productDoc.slug) {
      productDoc.slug = canonicalSlug;
      if (!hasOwn(updatesForSummary, "slug")) {
        updatesForSummary.slug = canonicalSlug;
      }
    }

    const dedupeKey = buildDedupeKey(
      productDoc.name,
      productDoc.brand as any,
      productDoc.category as any
    );
    productDoc.set("dedupeKey", dedupeKey);

    const slugOrKey = await Product.findOne({
      _id: { $ne: productDoc._id },
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
        details: {
          conflictOn: slugOrKey.slug === canonicalSlug ? "slug" : "dedupeKey",
        },
      });
      return;
    }

    const skusToCheck = (variantsForDoc ?? productDoc.variants ?? []).map(
      (v: any) => v.sku
    );
    if (skusToCheck.length) {
      const skuConflict = await Product.findOne({
        _id: { $ne: productDoc._id },
        seller: sellerId,
        isDeleted: { $ne: true },
        "variants.sku": { $in: skusToCheck },
      })
        .select("_id")
        .lean();

      if (skuConflict) {
        res.status(409).json({
          error: "Duplicate SKU",
          details: { skus: skusToCheck },
        });
        return;
      }
    }

    const updatedProduct: HydratedDocument<IProduct> = await productDoc.save();

    const changeSummary = detectChangedFieldsSummary(
      originalProduct,
      updatesForSummary
    );

    await publishNotificationEvent({
      userId: req?.user?.id,
      title: "Edit Product",
      message: `Product ${updatedProduct?.name} edited. ${changeSummary}`,
      read: false,
    });

    // Fire-and-forget activity logging via RabbitMQ
    publishProductActivity({
      user: userId,
      action: "update",
      products: [
        {
          _id: id,
          ...updatesForSummary,
        },
      ],
    }).catch((err) => console.error("🐇 Failed to log update activity:", err));

    io.emit("product:edited", updatedProduct);

    res.status(200).json({
      msg: "Product updated successfully.",
      product: updatedProduct,
    });
  } catch (err) {
    console.error("Failed to update product", err);
    res.status(500).json({ error: "Failed to update product." });
  }
};
