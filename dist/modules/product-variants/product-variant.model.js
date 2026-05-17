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
const mongoose_1 = __importStar(require("mongoose"));
const VariantImageSchema = new mongoose_1.Schema({
    url: { type: String, required: true, trim: true },
    alt: { type: String, trim: true, default: "" },
    isPrimary: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
}, { _id: false });
const VariantPricingSchema = new mongoose_1.Schema({
    currency: { type: String, required: true, uppercase: true, trim: true, default: "USD" },
    salePrice: { type: Number, required: true, min: 0 },
    compareAtPrice: {
        type: Number,
        min: 0,
        validate: {
            validator(value) {
                return value == null || value >= this.salePrice;
            },
            message: "compareAtPrice must be greater than or equal to salePrice.",
        },
    },
    dealerPrice: { type: Number, min: 0 },
    costPrice: { type: Number, min: 0 },
}, { _id: false });
const VariantStockSummarySchema = new mongoose_1.Schema({
    onHand: { type: Number, min: 0, default: 0 },
    available: { type: Number, min: 0, default: 0 },
    reserved: { type: Number, min: 0, default: 0 },
    sold: { type: Number, min: 0, default: 0 },
    safetyStock: { type: Number, min: 0, default: 0 },
}, { _id: false });
const ProductVariantSchema = new mongoose_1.Schema({
    productId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    sku: { type: String, required: true, trim: true, uppercase: true },
    barcode: { type: String, trim: true },
    optionValues: { type: Map, of: mongoose_1.Schema.Types.Mixed, default: {} },
    pricing: { type: VariantPricingSchema, required: true },
    stockSummary: { type: VariantStockSummarySchema, default: () => ({}) },
    images: { type: [VariantImageSchema], default: [] },
    isActive: { type: Boolean, default: true, index: true },
}, {
    timestamps: true,
    versionKey: false,
    toJSON: { flattenMaps: true },
    toObject: { flattenMaps: true },
});
ProductVariantSchema.pre("validate", function (next) {
    var _a, _b;
    if (this.sku)
        this.sku = String(this.sku).trim().toUpperCase();
    if ((_a = this.pricing) === null || _a === void 0 ? void 0 : _a.currency)
        this.pricing.currency = String(this.pricing.currency).toUpperCase();
    const summary = this.stockSummary || {};
    const available = Number((_b = summary.available) !== null && _b !== void 0 ? _b : 0);
    if (available < 0)
        this.invalidate("stockSummary.available", "available stock cannot be negative.");
    next();
});
ProductVariantSchema.index({ productId: 1, sku: 1 });
ProductVariantSchema.index({ sku: 1 }, { unique: true });
ProductVariantSchema.index({ barcode: 1 }, { sparse: true });
ProductVariantSchema.index({ productId: 1, isActive: 1 });
const ProductVariant = mongoose_1.default.models.ProductVariant ||
    mongoose_1.default.model("ProductVariant", ProductVariantSchema);
exports.default = ProductVariant;
