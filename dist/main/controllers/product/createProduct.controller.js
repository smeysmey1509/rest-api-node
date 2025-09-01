"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.createProduct = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const Product_1 = __importDefault(require("../../../models/Product"));
const server_1 = require("../../server");
const notification_service_1 = require("../../services/notification.service");
/** ---------------- helpers ---------------- */
const slugify = (s) => String(s || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
function toNumber(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}
function parseJSON(v, fallback) {
    if (v == null)
        return fallback;
    if (typeof v === "object")
        return v;
    if (typeof v === "string" && v.trim().length) {
        try {
            return JSON.parse(v);
        }
        catch (_a) {
            return fallback;
        }
    }
    return fallback;
}
function parseTags(input) {
    if (Array.isArray(input))
        return [...new Set(input.map((t) => String(t).trim()).filter(Boolean))];
    if (typeof input === "string") {
        const json = parseJSON(input, []);
        if (json.length)
            return [...new Set(json.map((t) => t.trim()).filter(Boolean))];
        return [...new Set(input.split(",").map((t) => t.trim()).filter(Boolean))];
    }
    return [];
}
function ensureObjectId(id, field) {
    if (!id || !mongoose_1.default.isValidObjectId(id))
        throw new Error(`Invalid ${field} id`);
    return new mongoose_1.Types.ObjectId(String(id));
}
function normalizeVariants(raw) {
    const arr = parseJSON(raw, []);
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
            stock, // legacy compatibility
            inventory: inv,
            attributes: v.attributes || {},
            images: Array.isArray(v.images) ? v.images : [],
            isActive: v.isActive !== false,
        };
    })
        .filter((v) => v.sku && Number.isFinite(v.price));
}
function normalizeAttributes(raw) {
    const obj = parseJSON(raw, {});
    const clean = {};
    for (const [k, val] of Object.entries(obj))
        clean[String(k)] = String(val);
    return clean;
}
function normalizeSeo(raw) {
    const seo = parseJSON(raw, undefined);
    if (!seo)
        return undefined;
    const keywords = Array.isArray(seo.keywords)
        ? seo.keywords.map((k) => String(k))
        : typeof seo.keywords === "string" && seo.keywords.trim()
            ? seo.keywords.split(",").map((k) => k.trim())
            : [];
    return {
        title: typeof seo.title === "string" ? seo.title : "",
        description: typeof seo.description === "string" ? seo.description : "",
        keywords,
    };
}
/** ---------------- controller ---------------- */
const createProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { name, slug, description, brand, price, compareAtPrice, currency, stock, status, category, seller, tag, attributes, variants, dimensions, weight, seo, isAdult, isHazardous, } = req.body;
        if (!name) {
            res.status(400).json({ error: "name is required" });
            return;
        }
        if (!category) {
            res.status(400).json({ error: "category is required" });
            return;
        }
        if (!seller) {
            res.status(400).json({ error: "seller is required" });
            return;
        }
        const categoryId = ensureObjectId(category, "category");
        const sellerId = ensureObjectId(seller, "seller");
        // Canonical identifiers (match schema)
        const canonicalSlug = slug ? slugify(slug) : slugify(name);
        const dedupeKey = [
            String(name).trim().toLowerCase(),
            String(brand || "").trim().toLowerCase(),
            String(categoryId),
        ].join("|");
        // Images (Multer + optional body URLs)
        const files = req.files;
        const uploaded = (files === null || files === void 0 ? void 0 : files.length) ? files.map((f) => `/uploads/${f.filename}`) : [];
        const imageUrls = Array.isArray(req.body.images)
            ? req.body.images.concat(uploaded)
            : uploaded;
        const normTags = parseTags(tag);
        const normVariants = normalizeVariants(variants);
        const normAttrs = normalizeAttributes(attributes);
        const normSeo = normalizeSeo(seo);
        const dimsObj = parseJSON(dimensions, undefined);
        const dims = dimsObj && (dimsObj.length || dimsObj.width || dimsObj.height)
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
        const slugOrKey = yield Product_1.default.findOne({
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
            const skuConflict = yield Product_1.default.findOne({
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
        const productDoc = yield Product_1.default.create(Object.assign(Object.assign(Object.assign(Object.assign({ name: String(name).trim(), slug: canonicalSlug, description: typeof description === "string" ? description : "", brand: typeof brand === "string" ? brand : "", currency: typeof currency === "string" && currency.length ? currency.toUpperCase() : "USD" }, (topLevelPrice !== undefined ? { price: topLevelPrice } : {})), (topLevelStock !== undefined ? { stock: topLevelStock } : {})), (normCompareAtPrice !== undefined ? { compareAtPrice: normCompareAtPrice } : {})), { category: categoryId, seller: sellerId, status: status === "Unpublished" ? "Unpublished" : "Published", tag: normTags, images: imageUrls, primaryImageIndex: 0, ratingAvg: 0, ratingCount: 0, salesCount: 0, isTrending: false, attributes: normAttrs, variants: normVariants, dimensions: dims, weight: weight != null ? toNumber(weight, 0) : 0, seo: normSeo, isAdult: isAdult === true || isAdult === "true", isHazardous: isHazardous === true || isHazardous === "true", dedupeKey }));
        // events
        const userInputId = (_a = req === null || req === void 0 ? void 0 : req.user) === null || _a === void 0 ? void 0 : _a.id;
        yield (0, notification_service_1.publishNotificationEvent)({
            userId: userInputId,
            title: "Created Product",
            message: `Product ${productDoc.name} has been created.`,
            read: false,
        });
        server_1.io.emit("product:created", String(productDoc._id));
        res.status(201).json({
            msg: "Product created.",
            product: productDoc.toObject({ virtuals: true }),
        });
    }
    catch (err) {
        if ((err === null || err === void 0 ? void 0 : err.code) === 11000) {
            // unique index collision: (seller, slug) / (seller, dedupeKey) / (seller, variants.sku)
            res.status(409).json({ error: "Duplicate key", details: err.keyValue });
            return;
        }
        console.error("Error creating product:", err === null || err === void 0 ? void 0 : err.message, err === null || err === void 0 ? void 0 : err.stack);
        res.status(400).json({ error: "Failed to create product." });
    }
});
exports.createProduct = createProduct;
