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
const Product_1 = __importDefault(require("../../../models/Product"));
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
const editProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const { id } = req.params;
        const body = (_a = req.body) !== null && _a !== void 0 ? _a : {};
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
            variantsForDoc = (0, productNormalization_1.normalizeVariants)(body.variants);
            const skus = variantsForDoc.map((v) => v.sku);
            const skuSet = new Set(skus);
            if (skuSet.size !== skus.length) {
                res.status(400).json({ error: "Duplicate SKUs in variants payload" });
                return;
            }
            productDoc.variants = variantsForDoc;
            updatesForSummary.variants = prepareVariantSummary(variantsForDoc);
            if (variantsForDoc.length) {
                if (productDoc.price !== undefined) {
                    productDoc.set("price", undefined);
                    updatesForSummary.price = undefined;
                }
                if (productDoc.stock !== undefined) {
                    productDoc.set("stock", undefined);
                    updatesForSummary.stock = undefined;
                }
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
        const skusToCheck = ((_d = variantsForDoc !== null && variantsForDoc !== void 0 ? variantsForDoc : productDoc.variants) !== null && _d !== void 0 ? _d : []).map((v) => v.sku);
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
            userId: (_e = req === null || req === void 0 ? void 0 : req.user) === null || _e === void 0 ? void 0 : _e.id,
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
