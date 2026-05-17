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
exports.productVariantService = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const product_model_1 = __importDefault(require("../products/product.model"));
const app_error_1 = require("../../shared/errors/app-error");
const product_variant_repository_1 = require("./product-variant.repository");
const ensureObjectId = (id, field) => {
    if (!id || !mongoose_1.default.isValidObjectId(id))
        throw new app_error_1.AppError(`Invalid ${field} id`, 400);
    return new mongoose_1.Types.ObjectId(String(id));
};
const toNumber = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};
const parseObject = (value) => {
    if (!value)
        return {};
    if (typeof value === "object")
        return value;
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            return parsed && typeof parsed === "object" ? parsed : {};
        }
        catch (_a) {
            return {};
        }
    }
    return {};
};
const normalizePricing = (payload) => {
    var _a, _b, _c, _d, _e, _f, _g;
    const pricing = parseObject(payload.pricing);
    const salePrice = toNumber((_b = (_a = pricing.salePrice) !== null && _a !== void 0 ? _a : payload.salePrice) !== null && _b !== void 0 ? _b : payload.price, 0);
    const costPrice = (_c = pricing.costPrice) !== null && _c !== void 0 ? _c : payload.costPrice;
    return {
        currency: String(pricing.currency || payload.currency || "USD").toUpperCase(),
        salePrice,
        compareAtPrice: ((_d = pricing.compareAtPrice) !== null && _d !== void 0 ? _d : payload.compareAtPrice)
            ? toNumber((_e = pricing.compareAtPrice) !== null && _e !== void 0 ? _e : payload.compareAtPrice)
            : undefined,
        dealerPrice: ((_f = pricing.dealerPrice) !== null && _f !== void 0 ? _f : payload.dealerPrice)
            ? toNumber((_g = pricing.dealerPrice) !== null && _g !== void 0 ? _g : payload.dealerPrice)
            : undefined,
        costPrice: costPrice == null ? undefined : toNumber(costPrice),
    };
};
exports.productVariantService = {
    listByProduct(productId) {
        return __awaiter(this, void 0, void 0, function* () {
            ensureObjectId(productId, "product");
            return product_variant_repository_1.productVariantRepository.listByProduct(productId);
        });
    },
    create(productId, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const productObjectId = ensureObjectId(productId, "product");
            const product = yield product_model_1.default.findById(productObjectId).select("_id").lean();
            if (!product)
                throw new app_error_1.AppError("Product not found", 404);
            if (!payload.sku)
                throw new app_error_1.AppError("sku is required", 400);
            const variant = yield product_variant_repository_1.productVariantRepository.create({
                productId: productObjectId,
                sku: String(payload.sku),
                barcode: payload.barcode ? String(payload.barcode) : undefined,
                optionValues: parseObject(payload.optionValues || payload.options),
                pricing: normalizePricing(payload),
                stockSummary: parseObject(payload.stockSummary),
                images: Array.isArray(payload.images) ? payload.images : [],
                isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
            });
            return variant;
        });
    },
    update(variantId, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            ensureObjectId(variantId, "variant");
            const updates = {};
            if (payload.sku !== undefined)
                updates.sku = String(payload.sku);
            if (payload.barcode !== undefined)
                updates.barcode = payload.barcode ? String(payload.barcode) : undefined;
            if (payload.optionValues !== undefined || payload.options !== undefined) {
                updates.optionValues = parseObject(payload.optionValues || payload.options);
            }
            if (payload.pricing !== undefined ||
                payload.salePrice !== undefined ||
                payload.price !== undefined ||
                payload.costPrice !== undefined) {
                updates.pricing = normalizePricing(payload);
            }
            if (payload.stockSummary !== undefined)
                updates.stockSummary = parseObject(payload.stockSummary);
            if (payload.images !== undefined)
                updates.images = Array.isArray(payload.images) ? payload.images : [];
            if (payload.isActive !== undefined)
                updates.isActive = Boolean(payload.isActive);
            const variant = yield product_variant_repository_1.productVariantRepository.update(variantId, updates);
            if (!variant)
                throw new app_error_1.AppError("Product variant not found", 404);
            return variant;
        });
    },
    remove(variantId) {
        return __awaiter(this, void 0, void 0, function* () {
            ensureObjectId(variantId, "variant");
            const variant = yield product_variant_repository_1.productVariantRepository.deactivate(variantId);
            if (!variant)
                throw new app_error_1.AppError("Product variant not found", 404);
            return { msg: "Product variant deleted successfully." };
        });
    },
};
