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
const ProductSchema = new mongoose_1.Schema({
    // core
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, index: true }, // unique can be added after backfill
    description: { type: String, default: "" },
    // merchandising
    brand: { type: String, trim: true, index: true },
    price: { type: Number, required: true, min: 0, index: true },
    compareAtPrice: { type: Number, min: 0 },
    currency: { type: String, default: "USD" },
    // inventory
    stock: { type: Number, required: true, default: 0, min: 0 },
    // relations
    category: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "Category", index: true },
    seller: { type: mongoose_1.default.Schema.Types.ObjectId, ref: "User", index: true },
    // status & tags
    status: { type: String, enum: ["Published", "Unpublished"], default: "Published", index: true },
    tag: { type: [String], default: [], index: true },
    // images (compatible with your existing docs)
    images: { type: [String], default: [] },
    primaryImageIndex: { type: Number, default: 0 },
    // analytics
    ratingAvg: { type: Number, default: 0, min: 0, max: 5, index: true },
    ratingCount: { type: Number, default: 0, min: 0 },
    salesCount: { type: Number, default: 0, min: 0, index: true },
    isTrending: { type: Boolean, default: false, index: true },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// --- Hygiene / defaults ---
ProductSchema.pre("save", function (next) {
    var _a, _b;
    // images / primary index
    if (!Array.isArray(this.images))
        this.images = [];
    if (this.images.length === 0)
        this.primaryImageIndex = 0;
    if (this.primaryImageIndex < 0 || this.primaryImageIndex >= this.images.length) {
        this.primaryImageIndex = 0;
    }
    // normalize tags
    if (Array.isArray(this.tag)) {
        const clean = Array.from(new Set(this.tag.map((t) => String(t).trim()).filter(Boolean)));
        this.tag = clean;
    }
    // slug (idempotent if already present)
    if (!this.slug) {
        const base = String(this.name || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)+/g, "");
        const suffix = ((_b = (_a = this._id) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _b !== void 0 ? _b : Date.now().toString()).slice(-6);
        this.slug = `${base}-${suffix}`;
    }
    next();
});
// --- Virtuals used by the card ---
ProductSchema.virtual("primaryImage").get(function () {
    var _a, _b;
    if (!((_a = this.images) === null || _a === void 0 ? void 0 : _a.length))
        return null;
    const idx = Number.isInteger(this.primaryImageIndex) ? this.primaryImageIndex : 0;
    return (_b = this.images[idx]) !== null && _b !== void 0 ? _b : this.images[0];
});
ProductSchema.virtual("discountPercent").get(function () {
    if (!this.compareAtPrice || this.compareAtPrice <= this.price)
        return 0;
    return Math.round(((this.compareAtPrice - this.price) / this.compareAtPrice) * 100);
});
// --- Indexes for search/list/filters ---
ProductSchema.index({ status: 1, category: 1, price: 1 });
ProductSchema.index({ brand: 1, price: 1 });
ProductSchema.index({ salesCount: -1, ratingCount: -1, ratingAvg: -1 });
ProductSchema.index({ name: "text", tag: "text" });
const Product = mongoose_1.default.models.Product || mongoose_1.default.model("Product", ProductSchema);
exports.default = Product;
