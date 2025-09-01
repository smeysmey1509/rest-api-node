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
Object.defineProperty(exports, "__esModule", { value: true });
// models/Product.ts
const mongoose_1 = __importStar(require("mongoose"));
;
function generateCustomId(prefix = "PRD") {
    // 3–4 pieces: prefix + base36 timestamp + 4-char random
    const ts = Date.now().toString(36).toUpperCase(); // e.g. "MBC123"
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${prefix}-${ts}-${rand}`; // e.g. "PRD-MBC123-8XQK"
}
const CUSTOM_ID_RE = /^[A-Z0-9][A-Z0-9._-]{2,31}$/; // 3..32 chars, A-Z 0-9 . _ -
function normalizeCustomId(v) {
    if (v == null)
        return undefined;
    const s = String(v).trim().toUpperCase();
    return s.length ? s : undefined;
}
const slugify = (s) => s
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
const InventorySchema = new mongoose_1.Schema({
    onHand: { type: Number, min: 0, default: 0 },
    reserved: { type: Number, min: 0, default: 0 },
    safetyStock: { type: Number, min: 0, default: 0 },
}, { _id: false });
const VariantSchema = new mongoose_1.Schema({
    sku: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, min: 0, default: 0 }, // legacy
    inventory: { type: InventorySchema, default: undefined }, // preferred
    attributes: { type: Map, of: String, default: {} },
    images: { type: [String], default: [] },
    isActive: { type: Boolean, default: true, index: true },
}, { _id: true, timestamps: true });
const ProductSchema = new mongoose_1.Schema({
    // core
    productId: {
        type: String,
        trim: true,
        immutable: true, // cannot change after create
        required: false, // we’ll fill it in pre-validate if missing
        validate: {
            validator(v) {
                if (v == null)
                    return true;
                const base = getEffectivePrice(this);
                if (typeof base !== "number")
                    return true;
                return v >= base;
            },
            message: "compareAtPrice must be ≥ price",
        }
    },
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 200,
        index: true,
    },
    slug: { type: String, required: false, index: true }, // enforced unique per seller below
    description: { type: String, default: "", maxlength: 50000 },
    // merchandising (legacy top-level)
    brand: { type: String, trim: true, default: "", index: true },
    price: {
        type: Number,
        min: 0,
        index: true,
        required: function () {
            return !(Array.isArray(this.variants) && this.variants.length > 0);
        },
    },
    compareAtPrice: {
        type: Number,
        min: 0,
        validate: {
            validator(v) {
                if (v == null)
                    return true;
                const base = getEffectivePrice(this);
                if (typeof base !== "number")
                    return true;
                return v >= base;
            },
            message: "compareAtPrice must be ≥ price",
        },
    },
    currency: {
        type: String,
        default: "USD",
        uppercase: true,
        minlength: 3,
        maxlength: 3,
    },
    // inventory (legacy top-level)
    stock: {
        type: Number,
        default: 0,
        min: 0,
        index: true,
        required: function () {
            return !(Array.isArray(this.variants) && this.variants.length > 0);
        },
    },
    // relations
    category: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Category",
        required: true,
        index: true,
    },
    seller: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    // status & tags
    status: {
        type: String,
        enum: ["Published", "Unpublished"],
        default: "Published",
        index: true,
    },
    tag: {
        type: [String],
        default: [],
        set: (arr) => Array.from(new Set((arr || []).map((t) => String(t).trim()).filter(Boolean))),
        index: true,
    },
    // media
    images: { type: [String], default: [] },
    primaryImageIndex: { type: Number, default: 0, min: 0 },
    // analytics (denormalized)
    ratingAvg: { type: Number, default: 0, min: 0, max: 5, index: true },
    ratingCount: { type: Number, default: 0, min: 0 },
    salesCount: { type: Number, default: 0, min: 0, index: true },
    isTrending: { type: Boolean, default: false, index: true },
    // advanced
    dimensions: {
        type: new mongoose_1.Schema({
            length: { type: Number, default: 0, min: 0 },
            width: { type: Number, default: 0, min: 0 },
            height: { type: Number, default: 0, min: 0 },
        }, { _id: false }),
        default: undefined,
    },
    weight: { type: Number, default: 0, min: 0 },
    variants: { type: [VariantSchema], default: [] },
    attributes: { type: Map, of: String, default: {} },
    // SEO
    seo: {
        title: { type: String, trim: true, default: "" },
        description: { type: String, trim: true, default: "" },
        keywords: { type: [String], default: [] },
    },
    // moderation
    isAdult: { type: Boolean, default: false, index: true },
    isHazardous: { type: Boolean, default: false },
    dedupeKey: { type: String, select: false, index: true },
    // soft delete
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
}, {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// helper inside models/Product.ts (top of file or near helpers)
function getEffectivePrice(doc) {
    if (typeof doc.price === "number")
        return doc.price;
    if (Array.isArray(doc.variants) && doc.variants.length) {
        const prices = doc.variants
            .filter((v) => (v === null || v === void 0 ? void 0 : v.isActive) !== false)
            .map((v) => Number(v.price))
            .filter((n) => Number.isFinite(n));
        if (prices.length)
            return Math.min(...prices);
    }
    return undefined;
}
// Normalize & generate slug
ProductSchema.pre("validate", function (next) {
    // existing slug logic...
    if (!this.slug && this.name)
        this.slug = slugify(this.name);
    if (this.slug)
        this.slug = slugify(this.slug);
    // normalize incoming productId to UPPER
    if (this.productId)
        this.productId = normalizeCustomId(this.productId);
    // if none provided, auto-generate
    if (!this.productId) {
        // you can pass brand prefix if you like:
        const prefix = this.brand ? String(this.brand).replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() : "PRD";
        this.productId = generateCustomId(prefix);
    }
    // (keep your other pre-validate code, e.g., dedupeKey build if you use it)
    next();
});
// Clamp primaryImageIndex, normalize images
ProductSchema.pre("save", function (next) {
    if (!Array.isArray(this.images))
        this.images = [];
    if (this.images.length === 0)
        this.primaryImageIndex = 0;
    if (typeof this.primaryImageIndex !== "number" ||
        this.primaryImageIndex < 0 ||
        this.primaryImageIndex >= this.images.length) {
        this.primaryImageIndex = 0;
    }
    next();
});
// Default scope: hide soft-deleted unless explicitly opted in
ProductSchema.pre(/^find/, function (next) {
    var _a, _b;
    // @ts-ignore
    if (!((_b = (_a = this.getOptions) === null || _a === void 0 ? void 0 : _a.call(this)) === null || _b === void 0 ? void 0 : _b.withDeleted)) {
        // @ts-ignore
        this.where({ isDeleted: { $ne: true } });
    }
    next();
});
// Validation to reduce redundancy footguns:
// If variants exist, top-level price/stock are optional; if no variants, they must be meaningful.
ProductSchema.path("variants").validate(function (variants) {
    if (Array.isArray(variants) && variants.length > 0)
        return true;
    // If no variants, enforce non-negative price/stock already handled by schema,
    // but require price > 0 for a sellable product.
    return typeof this.price === "number" && this.price >= 0;
}, "Either provide variants[] or a valid top-level price.");
// Prefer product images; fall back to first variant image
ProductSchema.virtual("primaryImage").get(function () {
    var _a, _b, _c, _d;
    if ((_a = this.images) === null || _a === void 0 ? void 0 : _a.length)
        return (_c = (_b = this.images[this.primaryImageIndex]) !== null && _b !== void 0 ? _b : this.images[0]) !== null && _c !== void 0 ? _c : null;
    const v0 = (_d = this.variants) === null || _d === void 0 ? void 0 : _d.find((v) => { var _a; return (_a = v.images) === null || _a === void 0 ? void 0 : _a.length; });
    return v0 ? v0.images[0] : null;
});
// Simple percent off from legacy top-level pricing (if used)
ProductSchema.virtual("discountPercent").get(function () {
    const base = getEffectivePrice(this);
    if (!this.compareAtPrice || typeof base !== "number" || this.compareAtPrice <= 0)
        return 0;
    if (this.compareAtPrice <= base)
        return 0;
    return Math.round(((this.compareAtPrice - base) / this.compareAtPrice) * 100);
});
// Sum available across variants; if no variants, use legacy stock
ProductSchema.virtual("availableTotal").get(function () {
    var _a;
    if (Array.isArray(this.variants) && this.variants.length) {
        return this.variants
            .filter((v) => v.isActive !== false)
            .reduce((acc, v) => {
            var _a;
            if (v.inventory) {
                const { onHand = 0, reserved = 0, safetyStock = 0 } = v.inventory;
                return acc + Math.max(0, onHand - reserved - safetyStock);
            }
            return acc + Math.max(0, (_a = v.stock) !== null && _a !== void 0 ? _a : 0);
        }, 0);
    }
    return Math.max(0, (_a = this.stock) !== null && _a !== void 0 ? _a : 0);
});
// Text search across key fields
ProductSchema.index({
    name: "text",
    brand: "text",
    description: "text",
    tag: "text",
    "seo.title": "text",
}, {
    name: "product_text",
    weights: { name: 10, brand: 5, description: 3, tag: 2 },
});
// Storefront filters / sorts
ProductSchema.index({ status: 1, category: 1, price: 1, createdAt: -1 });
ProductSchema.index({ seller: 1, slug: 1, name: 1 }, {
    unique: true,
    partialFilterExpression: { isDeleted: { $ne: true } },
    collation: { locale: "en", strength: 2 }, // case-insensitive
});
ProductSchema.index({ isTrending: 1, salesCount: -1, ratingAvg: -1 });
// Unique product ID per seller (prefix+number), ignores soft-deleted
ProductSchema.index({ seller: 1, customId: 1 }, {
    unique: true,
    partialFilterExpression: { isDeleted: { $ne: true } },
    collation: { locale: "en", strength: 2 }, // case-insensitive
});
// Unique slug per seller (ignores soft-deleted)
ProductSchema.index({ seller: 1, slug: 1 }, { unique: true, partialFilterExpression: { isDeleted: { $ne: true } } });
// unique (seller, customId)
ProductSchema.index({ seller: 1, customId: 1 }, {
    unique: true,
    partialFilterExpression: { isDeleted: { $ne: true } },
    collation: { locale: "en", strength: 2 }, // case-insensitive
});
// Unique SKU per seller across variants
ProductSchema.index({ seller: 1, "variants.sku": 1 }, { unique: true, partialFilterExpression: { isDeleted: { $ne: true } } });
const Product = mongoose_1.default.models.Product || mongoose_1.default.model("Product", ProductSchema);
exports.default = Product;
