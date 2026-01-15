"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.editProduct = void 0;
const Product_1 = __importDefault(require("../../models/Product"));
const activity_service_1 = require("../../services/activity.service");
const server_1 = require("../../server");
const notification_service_1 = require("../../services/notification.service");
const productNormalization_1 = require("../../utils/productNormalization");
function detectChangedFieldsSummary(original, updates) {
    const changes = [];
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
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const normalizeBoolean = (value) => {
    if (value === undefined)
        return undefined;
    if (value === null)
        return false;
    if (typeof value === "boolean")
        return value;
    if (typeof value === "number")
        return value !== 0;
    if (typeof value === "string") {
        const lowered = value.toLowerCase();
        if (["true", "1", "yes", "on"].includes(lowered))
            return true;
        if (["false", "0", "no", "off"].includes(lowered))
            return false;
    }
    return undefined;
};
const dedupeStringArray = (values) => {
    const seen = new Set();
    const result = [];
    for (const raw of values) {
        const str = String(raw !== null && raw !== void 0 ? raw : "").trim();
        if (!str.length || seen.has(str))
            continue;
        seen.add(str);
        result.push(str);
    }
    return result;
};
const toImageArray = (input) => {
    if (Array.isArray(input)) {
        return dedupeStringArray(input.map((img) => String(img)));
    }
    if (typeof input === "string") {
        const trimmed = input.trim();
        if (!trimmed.length)
            return [];
        const parsed = (0, productNormalization_1.parseJSON)(trimmed, []);
        if (Array.isArray(parsed) && parsed.length) {
            return dedupeStringArray(parsed.map((img) => String(img)));
        }
        if (trimmed.includes(",") &&
            !trimmed.includes("://") &&
            !/^data:/i.test(trimmed)) {
            const splitted = trimmed.split(",").map((img) => img.trim());
            return dedupeStringArray(splitted);
        }
        return dedupeStringArray([trimmed]);
    }
    return [];
};
const areStringArraysEqual = (a, b) => {
    if (a.length !== b.length)
        return false;
    return a.every((value, index) => value === b[index]);
};
const computeVariantAvailableStock = (variants) => {
    if (!Array.isArray(variants) || variants.length === 0)
        return 0;
    return variants.reduce((acc, variant) => {
        if (!variant)
            return acc;
        if (variant === null || variant === void 0 ? void 0 : variant.inventory) {
            const onHand = (0, productNormalization_1.toNumber)(variant.inventory.onHand, 0);
            const reserved = (0, productNormalization_1.toNumber)(variant.inventory.reserved, 0);
            const safetyStock = (0, productNormalization_1.toNumber)(variant.inventory.safetyStock, 0);
            return acc + Math.max(0, onHand - reserved - safetyStock);
        }
        const legacyStock = (0, productNormalization_1.toNumber)(variant === null || variant === void 0 ? void 0 : variant.stock, 0);
        return acc + Math.max(0, legacyStock);
    }, 0);
};
const syncProductStockWithVariants = (productDoc, updates) => {
    if (!Array.isArray(productDoc.variants) || !productDoc.variants.length)
        return;
    const aggregated = computeVariantAvailableStock(productDoc.variants);
    if (productDoc.stock !== aggregated) {
        productDoc.stock = aggregated;
        updates.stock = aggregated;
    }
};
const prepareVariantSummary = (variants) => variants.map((variant) => {
    var _a;
    return ({
        sku: variant.sku,
        price: variant.price,
        stock: variant.stock,
        inventory: variant.inventory,
        attributes: Object.fromEntries((_a = variant.attributes) !== null && _a !== void 0 ? _a : []),
        images: variant.images,
        isActive: variant.isActive,
    });
});
const coerceIdentifier = (value) => {
    if (value === undefined || value === null)
        return undefined;
    const str = String(value).trim();
    return str.length ? str : undefined;
};
const variantIndexKeys = [
    "variantIndex",
    "index",
    "position",
    "order",
    "idx",
    "variantPosition",
];
const parseVariantIndexHint = (variant) => {
    for (const key of variantIndexKeys) {
        if (variant[key] === undefined || variant[key] === null)
            continue;
        const parsed = Number(variant[key]);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    return undefined;
};
const toAttributesMap = (value) => {
    var _a, _b, _c, _d, _e, _f, _g;
    if (value === undefined)
        return undefined;
    if (value === null)
        return new Map();
    if (value instanceof Map) {
        return new Map(Array.from(value.entries()).map(([key, val]) => [
            String(key),
            String(val !== null && val !== void 0 ? val : ""),
        ]));
    }
    if (Array.isArray(value)) {
        const obj = {};
        for (const entry of value) {
            if (!entry)
                continue;
            if (Array.isArray(entry) && entry.length >= 2) {
                const [key, val] = entry;
                if (key !== undefined)
                    obj[String(key)] = val;
                continue;
            }
            if (typeof entry === "object") {
                const key = (_d = (_c = (_b = (_a = entry.key) !== null && _a !== void 0 ? _a : entry.name) !== null && _b !== void 0 ? _b : entry.label) !== null && _c !== void 0 ? _c : entry.attribute) !== null && _d !== void 0 ? _d : entry.attributeName;
                if (key !== undefined) {
                    const val = (_g = (_f = (_e = entry.value) !== null && _e !== void 0 ? _e : entry.val) !== null && _f !== void 0 ? _f : entry.option) !== null && _g !== void 0 ? _g : entry.attributeValue;
                    obj[String(key)] = val;
                }
            }
        }
        const normalized = (0, productNormalization_1.normalizeAttributes)(obj);
        return new Map(Object.entries(normalized).map(([key, val]) => [key, String(val !== null && val !== void 0 ? val : "")]));
    }
    const normalized = (0, productNormalization_1.normalizeAttributes)(value);
    return new Map(Object.entries(normalized).map(([key, val]) => [key, String(val !== null && val !== void 0 ? val : "")]));
};
const buildAttributesKey = (value) => {
    const map = toAttributesMap(value);
    if (!map)
        return undefined;
    const entries = Array.from(map.entries());
    if (!entries.length)
        return undefined;
    entries.sort(([a], [b]) => a.localeCompare(b));
    return entries.map(([key, val]) => `${key}:${val}`).join("|");
};
const editProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        const { id } = req.params;
        const body = (_a = req.body) !== null && _a !== void 0 ? _a : {};
        // 🔹 Parse JSON strings when sent via form-data
        const parseIfJson = (value) => {
            if (typeof value === "string") {
                try {
                    return JSON.parse(value);
                }
                catch (_a) {
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
            }
            else if (hasOwn(body, "varaint")) {
                body.variants = body.varaint;
            }
        }
        const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b.id;
        const rawFiles = req.files;
        const files = Array.isArray(rawFiles)
            ? rawFiles
            : rawFiles && typeof rawFiles === "object"
                ? Object.values(rawFiles).reduce((acc, value) => {
                    if (Array.isArray(value)) {
                        acc.push(...value);
                    }
                    return acc;
                }, [])
                : [];
        const uploadedImagePaths = files.map((file) => `/uploads/${file.filename}`);
        const productDoc = yield Product_1.default.findById(id);
        if (!productDoc) {
            res.status(404).json({ msg: "Product not found" });
            return;
        }
        const originalPrimaryImageIndex = (_c = productDoc.primaryImageIndex) !== null && _c !== void 0 ? _c : 0;
        const originalProduct = productDoc.toObject({
            depopulate: true,
            flattenMaps: true,
        });
        if (!originalProduct) {
            res.status(404).json({ msg: "Product not found after update" });
            return;
        }
        const updatesForSummary = {};
        let sellerId = productDoc.seller;
        if (hasOwn(body, "seller")) {
            const newSeller = (0, productNormalization_1.ensureObjectId)(body.seller, "seller");
            if (String(newSeller) !== String(productDoc.seller)) {
                productDoc.seller = newSeller;
                updatesForSummary.seller = String(newSeller);
            }
            sellerId = productDoc.seller;
        }
        let categoryId = productDoc.category;
        if (hasOwn(body, "category")) {
            const newCategory = (0, productNormalization_1.ensureObjectId)(body.category, "category");
            if (String(newCategory) !== String(productDoc.category)) {
                productDoc.category = newCategory;
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
                ? (0, productNormalization_1.ensureObjectId)(body.brand, "brand")
                : undefined;
            if (String(newBrand || "") !== String(productDoc.brand || "")) {
                productDoc.brand = newBrand;
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
            const description = typeof body.description === "string" ? body.description : "";
            if (description !== productDoc.description) {
                productDoc.description = description;
                updatesForSummary.description = description;
            }
        }
        if (hasOwn(body, "currency")) {
            const currency = typeof body.currency === "string" && body.currency.trim().length
                ? body.currency.trim().toUpperCase()
                : productDoc.currency;
            if (currency && currency !== productDoc.currency) {
                productDoc.currency = currency;
                updatesForSummary.currency = currency;
            }
        }
        if (hasOwn(body, "status")) {
            const status = body.status === "Unpublished" ? "Unpublished" : "Published";
            if (status !== productDoc.status) {
                productDoc.status = status;
                updatesForSummary.status = status;
            }
        }
        if (hasOwn(body, "slug")) {
            const rawSlug = String(body.slug || "").trim();
            const newSlug = rawSlug.length
                ? (0, productNormalization_1.slugify)(rawSlug)
                : (0, productNormalization_1.slugify)(productDoc.name);
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
            const tags = (0, productNormalization_1.parseTags)(body.tag);
            productDoc.tag = tags;
            updatesForSummary.tag = tags;
        }
        if (hasOwn(body, "attributes")) {
            const attrs = (0, productNormalization_1.normalizeAttributes)(body.attributes);
            productDoc.set("attributes", attrs);
            updatesForSummary.attributes = attrs;
        }
        let variantsForDoc;
        if (hasOwn(body, "variants")) {
            const rawIncoming = Array.isArray(body.variants)
                ? body.variants
                : [body.variants];
            const incomingEntries = rawIncoming
                .map((variant, index) => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
                if (!variant || typeof variant !== "object")
                    return undefined;
                const record = variant;
                const id = coerceIdentifier((_c = (_b = (_a = record._id) !== null && _a !== void 0 ? _a : record.id) !== null && _b !== void 0 ? _b : record.variantId) !== null && _c !== void 0 ? _c : record.variant_id);
                const sku = coerceIdentifier((_g = (_f = (_e = (_d = record.sku) !== null && _d !== void 0 ? _d : record.SKU) !== null && _e !== void 0 ? _e : record.variantSku) !== null && _f !== void 0 ? _f : record.variantSKU) !== null && _g !== void 0 ? _g : record.variant_sku);
                const indexHint = parseVariantIndexHint(record);
                const attrKey = buildAttributesKey((_k = (_j = (_h = record.attributes) !== null && _h !== void 0 ? _h : record.attrs) !== null && _j !== void 0 ? _j : record.attributeValues) !== null && _k !== void 0 ? _k : record.variantAttributes);
                return {
                    raw: Object.assign({}, record),
                    index,
                    id,
                    sku,
                    indexHint,
                    attrKey,
                };
            })
                .filter((entry) => Boolean(entry));
            const existingVariants = (_d = productDoc.variants) !== null && _d !== void 0 ? _d : [];
            const consumed = new Set();
            // ✅ Merge incoming variants into existing ones
            const takeMatch = (predicate) => {
                const match = incomingEntries.find((entry) => !consumed.has(entry.index) && predicate(entry));
                if (match) {
                    consumed.add(match.index);
                }
                return match;
            };
            const updatedVariants = existingVariants.map((variant, variantIndex) => {
                var _a, _b, _c;
                const variantId = coerceIdentifier(variant === null || variant === void 0 ? void 0 : variant._id);
                const variantSku = coerceIdentifier(variant === null || variant === void 0 ? void 0 : variant.sku);
                const variantAttrKey = buildAttributesKey(variant === null || variant === void 0 ? void 0 : variant.attributes);
                let matchEntry = takeMatch((entry) => !!entry.id && !!variantId && entry.id === variantId) ||
                    takeMatch((entry) => !!entry.sku && !!variantSku && entry.sku === variantSku);
                if (!matchEntry) {
                    matchEntry = takeMatch((entry) => entry.indexHint !== undefined &&
                        entry.indexHint === variantIndex);
                }
                if (!matchEntry && variantAttrKey) {
                    matchEntry = takeMatch((entry) => !!entry.attrKey && entry.attrKey === variantAttrKey);
                }
                if (!matchEntry &&
                    incomingEntries.length === existingVariants.length) {
                    matchEntry = takeMatch((entry) => entry.index === variantIndex);
                }
                if (!matchEntry &&
                    existingVariants.length === 1 &&
                    incomingEntries.length === 1) {
                    matchEntry = takeMatch(() => true);
                }
                if (!matchEntry) {
                    return variant;
                }
                const incoming = matchEntry.raw;
                const base = (_b = (_a = variant.toObject) === null || _a === void 0 ? void 0 : _a.call(variant)) !== null && _b !== void 0 ? _b : variant;
                const merged = Object.assign({}, base);
                if (incoming.sku !== undefined) {
                    const newSku = coerceIdentifier(incoming.sku);
                    if (newSku !== undefined) {
                        merged.sku = newSku;
                    }
                }
                if (incoming.price !== undefined) {
                    const priceVal = (0, productNormalization_1.toNumber)(incoming.price, NaN);
                    if (Number.isFinite(priceVal) && priceVal >= 0) {
                        merged.price = priceVal;
                    }
                }
                if (incoming.stock !== undefined) {
                    if (incoming.stock === null) {
                        merged.stock = undefined;
                    }
                    else {
                        const stockVal = (0, productNormalization_1.toNumber)(incoming.stock, NaN);
                        if (Number.isFinite(stockVal) && stockVal >= 0) {
                            merged.stock = stockVal;
                        }
                    }
                }
                // ✅ Add new variants if any don’t exist yet
                if (incoming.inventory !== undefined) {
                    if (incoming.inventory === null) {
                        merged.inventory = undefined;
                    }
                    else if (typeof incoming.inventory === "object") {
                        const currentInventory = (_c = base.inventory) !== null && _c !== void 0 ? _c : {};
                        const nextInventory = Object.assign({}, currentInventory);
                        const inv = incoming.inventory;
                        if (Object.prototype.hasOwnProperty.call(inv, "onHand")) {
                            nextInventory.onHand = (0, productNormalization_1.toNumber)(inv.onHand, (0, productNormalization_1.toNumber)(currentInventory === null || currentInventory === void 0 ? void 0 : currentInventory.onHand, 0));
                        }
                        if (Object.prototype.hasOwnProperty.call(inv, "reserved")) {
                            nextInventory.reserved = (0, productNormalization_1.toNumber)(inv.reserved, (0, productNormalization_1.toNumber)(currentInventory === null || currentInventory === void 0 ? void 0 : currentInventory.reserved, 0));
                        }
                        if (Object.prototype.hasOwnProperty.call(inv, "safetyStock")) {
                            nextInventory.safetyStock = (0, productNormalization_1.toNumber)(inv.safetyStock, (0, productNormalization_1.toNumber)(currentInventory === null || currentInventory === void 0 ? void 0 : currentInventory.safetyStock, 0));
                        }
                        merged.inventory = nextInventory;
                    }
                }
                if (incoming.attributes !== undefined) {
                    const attrsMap = toAttributesMap(incoming.attributes);
                    merged.attributes = attrsMap !== null && attrsMap !== void 0 ? attrsMap : new Map();
                }
                if (incoming.images !== undefined) {
                    if (incoming.images === null) {
                        merged.images = [];
                    }
                    else {
                        merged.images = toImageArray(incoming.images);
                    }
                }
                if (incoming.isActive !== undefined) {
                    const boolVal = normalizeBoolean(incoming.isActive);
                    if (boolVal !== undefined) {
                        merged.isActive = boolVal;
                    }
                }
                return merged;
            });
            const newVariantEntries = incomingEntries.filter((entry) => !consumed.has(entry.index));
            const newVariants = (0, productNormalization_1.normalizeVariants)(newVariantEntries.map((entry) => entry.raw));
            const mergedVariants = [...updatedVariants, ...newVariants];
            productDoc.variants = mergedVariants;
            variantsForDoc = mergedVariants;
            updatesForSummary.variants = prepareVariantSummary(mergedVariants);
            // Clear top-level price/stock when using variants
            if (mergedVariants.length) {
                productDoc.set("price", undefined);
                productDoc.set("stock", undefined);
            }
        }
        if (hasOwn(body, "price") && !(variantsForDoc === null || variantsForDoc === void 0 ? void 0 : variantsForDoc.length)) {
            const raw = body.price;
            if (raw === null || raw === "") {
                if (productDoc.price !== undefined) {
                    productDoc.set("price", undefined);
                    updatesForSummary.price = undefined;
                }
            }
            else {
                const priceVal = (0, productNormalization_1.toNumber)(raw, NaN);
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
            }
            else {
                const costVal = (0, productNormalization_1.toNumber)(raw, NaN);
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
        if (hasOwn(body, "stock") && !(variantsForDoc === null || variantsForDoc === void 0 ? void 0 : variantsForDoc.length)) {
            const raw = body.stock;
            if (raw === null || raw === "") {
                if (productDoc.stock !== undefined) {
                    productDoc.set("stock", undefined);
                    updatesForSummary.stock = undefined;
                }
            }
            else {
                const stockVal = Math.max(0, Math.floor((0, productNormalization_1.toNumber)(raw, 0)));
                if (productDoc.stock !== stockVal) {
                    productDoc.stock = stockVal;
                    updatesForSummary.stock = stockVal;
                }
            }
        }
        syncProductStockWithVariants(productDoc, updatesForSummary);
        if (hasOwn(body, "compareAtPrice")) {
            const raw = body.compareAtPrice;
            if (raw === null || raw === "") {
                if (productDoc.compareAtPrice !== undefined) {
                    productDoc.set("compareAtPrice", undefined);
                    updatesForSummary.compareAtPrice = undefined;
                }
            }
            else {
                const compareVal = (0, productNormalization_1.toNumber)(raw, NaN);
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
            const dims = (0, productNormalization_1.normalizeDimensions)(body.dimensions);
            productDoc.dimensions = dims;
            updatesForSummary.dimensions = dims;
        }
        if (hasOwn(body, "weight")) {
            const weight = (0, productNormalization_1.toNumber)(body.weight, 0);
            if (productDoc.weight !== weight) {
                productDoc.weight = weight;
                updatesForSummary.weight = weight;
            }
        }
        if (hasOwn(body, "seo")) {
            const seo = (0, productNormalization_1.normalizeSeo)(body.seo);
            if (seo) {
                productDoc.seo = seo;
                updatesForSummary.seo = seo;
            }
            else {
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
        const imagesToRemove = hasOwn(body, "removeImages")
            ? toImageArray(body.removeImages)
            : [];
        if (hasOwn(body, "images") ||
            uploadedImagePaths.length ||
            imagesToRemove.length) {
            const existingImages = Array.isArray(productDoc.images)
                ? productDoc.images.map((img) => String(img))
                : [];
            const baseImages = hasOwn(body, "images")
                ? toImageArray(body.images)
                : existingImages;
            const filteredImages = imagesToRemove.length
                ? baseImages.filter((img) => !imagesToRemove.includes(img))
                : baseImages;
            const combinedImages = dedupeStringArray([
                ...filteredImages,
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
            const idx = Math.max(0, Math.floor((0, productNormalization_1.toNumber)(body.primaryImageIndex, 0)));
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
                productDoc.isTrending = bool;
                updatesForSummary.isTrending = bool;
            }
        }
        const canonicalSlug = productDoc.slug
            ? (0, productNormalization_1.slugify)(productDoc.slug)
            : (0, productNormalization_1.slugify)(productDoc.name);
        if (canonicalSlug !== productDoc.slug) {
            productDoc.slug = canonicalSlug;
            if (!hasOwn(updatesForSummary, "slug")) {
                updatesForSummary.slug = canonicalSlug;
            }
        }
        const dedupeKey = (0, productNormalization_1.buildDedupeKey)(productDoc.name, productDoc.brand, productDoc.category);
        productDoc.set("dedupeKey", dedupeKey);
        const slugOrKey = yield Product_1.default.findOne({
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
        const skusToCheck = ((_e = variantsForDoc !== null && variantsForDoc !== void 0 ? variantsForDoc : productDoc.variants) !== null && _e !== void 0 ? _e : [])
            .map((v) => coerceIdentifier(v.sku))
            .filter((sku) => Boolean(sku));
        if (skusToCheck.length) {
            const skuConflict = yield Product_1.default.findOne({
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
        const updatedProduct = yield productDoc.save();
        const changeSummary = detectChangedFieldsSummary(originalProduct, updatesForSummary);
        yield (0, notification_service_1.publishNotificationEvent)({
            userId: (_f = req === null || req === void 0 ? void 0 : req.user) === null || _f === void 0 ? void 0 : _f.id,
            title: "Edit Product",
            message: `Product ${updatedProduct === null || updatedProduct === void 0 ? void 0 : updatedProduct.name} edited. ${changeSummary}`,
            read: false,
        });
        // Fire-and-forget activity logging via RabbitMQ
        (0, activity_service_1.publishProductActivity)({
            user: userId,
            action: "update",
            products: [
                Object.assign({ _id: id }, updatesForSummary),
            ],
        }).catch((err) => console.error("🐇 Failed to log update activity:", err));
        server_1.io.emit("product:edited", updatedProduct);
        res.status(200).json({
            msg: "Product updated successfully.",
            product: updatedProduct,
        });
    }
    catch (err) {
        console.error("Failed to update product", err);
        res.status(500).json({ error: "Failed to update product." });
    }
});
exports.editProduct = editProduct;
