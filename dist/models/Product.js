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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// models/Product.ts
const mongoose_1 = __importStar(require("mongoose"));
const mongoose_lean_virtuals_1 = __importDefault(require("mongoose-lean-virtuals"));
/* ===================== Utils ===================== */
const slugify = (s) => s.toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
/* ===================== Sub Schemas ===================== */
const PriceTierSchema = new mongoose_1.Schema({
    minQty: { type: Number, min: 1, required: true },
    amount: { type: Number, min: 0, required: true }, // minor units
}, { _id: false });
const PriceSchema = new mongoose_1.Schema({
    currency: { type: String, minlength: 3, maxlength: 3, required: true },
    amount: { type: Number, min: 0, required: true },
    compareAt: {
        type: Number,
        min: 0,
        validate: {
            validator(v, ctx) {
                if (v == null)
                    return true;
                return v >= ctx.amount;
            },
            message: "compareAt must be >= amount",
        },
    },
    tiers: { type: [PriceTierSchema], default: [] },
}, { _id: false });
const InventorySchema = new mongoose_1.Schema({
    onHand: { type: Number, min: 0, default: 0 },
    reserved: { type: Number, min: 0, default: 0 },
    safetyStock: { type: Number, min: 0, default: 0 },
}, { _id: false });
const MediaSchema = new mongoose_1.Schema({
    url: { type: String, trim: true, required: true },
    alt: { type: String, trim: true, default: "" },
    role: { type: String, enum: ["primary", "gallery", "thumbnail"], default: "gallery" },
}, { _id: false });
const VariantSchema = new mongoose_1.Schema({
    sku: { type: String, required: true, trim: true },
    barcode: { type: String, trim: true },
    gtin: { type: String, trim: true },
    attributes: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    price: { type: PriceSchema, required: true },
    inventory: { type: InventorySchema, required: true, default: {} },
    media: { type: [MediaSchema], default: [] },
    isActive: { type: Boolean, default: true, index: true },
}, { _id: true, timestamps: true });
/* ===================== Product Schema ===================== */
const ProductSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 200 },
    slug: { type: String, required: false, trim: true, lowercase: true, index: true },
    description: { type: String, default: "", maxlength: 50000 },
    localized: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    brand: { type: String, trim: true, default: "" },
    categories: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Category", index: true }],
    seller: { type: mongoose_1.Schema.Types.ObjectId, ref: "Seller", required: true, index: true },
    status: { type: String, enum: ["Published", "Unpublished"], default: "Unpublished", index: true },
    tags: {
        type: [String],
        default: [],
        set: (arr) => Array.from(new Set((arr || []).map((t) => t.trim().toLowerCase()))),
        index: true,
    },
    isTrending: { type: Boolean, default: false, index: true },
    optionKeys: { type: [String], default: [] },
    variants: { type: [VariantSchema], default: [] },
    ratingAvg: { type: Number, default: 0, min: 0, max: 5, index: true },
    ratingCount: { type: Number, default: 0, min: 0 },
    salesCount: { type: Number, default: 0, min: 0, index: true },
    media: { type: [MediaSchema], default: [] },
    seo: {
        title: { type: String, trim: true, default: "" },
        description: { type: String, trim: true, default: "" },
        keywords: { type: [String], default: [] },
    },
    defaultCurrency: { type: String, minlength: 3, maxlength: 3, default: "USD" },
    dimensions: {
        weightG: { type: Number, min: 0 },
        lengthMm: { type: Number, min: 0 },
        widthMm: { type: Number, min: 0 },
        heightMm: { type: Number, min: 0 },
    },
    isAdult: { type: Boolean, default: false, index: true },
    isHazardous: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
}, {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
/* ===================== Virtuals ===================== */
// First primary media across product or variants
ProductSchema.virtual("primaryImage").get(function () {
    var _a, _b;
    const pick = (arr) => { var _a, _b, _c; return ((_a = (arr || []).find((m) => m.role === "primary")) === null || _a === void 0 ? void 0 : _a.url) || ((_c = (_b = arr[0]) === null || _b === void 0 ? void 0 : _b.url) !== null && _c !== void 0 ? _c : null); };
    return pick(this.media) || pick(((_b = (_a = this.variants) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.media) || []);
});
// Total available inventory across active variants
ProductSchema.virtual("availableTotal").get(function () {
    const sum = (n) => (typeof n === "number" ? n : 0);
    return (this.variants || [])
        .filter((v) => v.isActive)
        .reduce((acc, v) => {
        var _a, _b, _c;
        const onHand = sum((_a = v.inventory) === null || _a === void 0 ? void 0 : _a.onHand);
        const reserved = sum((_b = v.inventory) === null || _b === void 0 ? void 0 : _b.reserved);
        const safety = sum((_c = v.inventory) === null || _c === void 0 ? void 0 : _c.safetyStock);
        const available = Math.max(0, onHand - reserved - safety);
        return acc + available;
    }, 0);
});
/* ===================== Statics ===================== */
ProductSchema.statics.findBySlug = function (sellerId, slug) {
    return this.findOne({ seller: sellerId, slug, isDeleted: { $ne: true } });
};
/* ===================== Hooks ===================== */
// Default scope: hide soft-deleted unless explicitly asked
ProductSchema.pre(/^find/, function (next) {
    var _a;
    // @ts-ignore
    if (!((_a = this.getOptions()) === null || _a === void 0 ? void 0 : _a.withDeleted))
        this.where({ isDeleted: { $ne: true } });
    next();
});
// Normalize slug (generate from name if missing)
ProductSchema.pre("validate", function (next) {
    if (!this.slug && this.name)
        this.slug = slugify(this.name);
    next();
});
ProductSchema.pre("save", function (next) {
    if (this.isModified("slug"))
        this.slug = slugify(this.slug);
    next();
});
/* ===================== Indexes ===================== */
// Text search (names, descriptions, brand, tags)
ProductSchema.index({ name: "text", description: "text", brand: "text", "seo.title": "text", tags: "text" }, { name: "product_text", weights: { name: 10, brand: 5, description: 3, tags: 2 } });
// Seller-scoped unique slug for active products
ProductSchema.index({ seller: 1, slug: 1 }, { unique: true, partialFilterExpression: { isDeleted: { $ne: true } } });
// Fast storefront queries
ProductSchema.index({ seller: 1, status: 1, createdAt: -1 });
ProductSchema.index({ categories: 1, status: 1, "variants.price.amount": 1 });
ProductSchema.index({ "variants.isActive": 1, "variants.attributes.color": 1 }); // example attr
ProductSchema.index({ isTrending: 1, salesCount: -1, ratingAvg: -1 });
// Unique SKU per seller (across variants)
ProductSchema.index({ seller: 1, "variants.sku": 1 }, { unique: true, partialFilterExpression: { isDeleted: { $ne: true } } });
// “Available > 0” queries (via partial index on computed rule)
// MongoDB can’t index virtuals; but a practical approximation is onHand > reserved + safetyStock
ProductSchema.index({ "variants.inventory.onHand": 1, "variants.inventory.reserved": 1 }, { name: "inv_lookup" });
/* ===================== Plugins & Export ===================== */
ProductSchema.plugin(mongoose_lean_virtuals_1.default);
const Product = mongoose_1.default.models.Product ||
    mongoose_1.default.model("Product", ProductSchema);
exports.default = Product;
