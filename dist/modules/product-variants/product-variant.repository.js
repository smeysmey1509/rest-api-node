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
exports.productVariantRepository = void 0;
const product_variant_model_1 = __importDefault(require("./product-variant.model"));
exports.productVariantRepository = {
    listByProduct(productId) {
        return product_variant_model_1.default.find({ productId, isActive: { $ne: false } }).sort({ createdAt: -1 }).lean();
    },
    findById(id, session) {
        const query = product_variant_model_1.default.findById(id);
        if (session)
            query.session(session);
        return query;
    },
    findBySku(sku) {
        return product_variant_model_1.default.findOne({ sku: String(sku).trim().toUpperCase() });
    },
    create(payload) {
        return product_variant_model_1.default.create(payload);
    },
    update(id, payload) {
        return product_variant_model_1.default.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
    },
    deactivate(id) {
        return product_variant_model_1.default.findByIdAndUpdate(id, { isActive: false }, { new: true });
    },
    updateStockSummary(variantId, summary, session) {
        return __awaiter(this, void 0, void 0, function* () {
            return product_variant_model_1.default.findByIdAndUpdate(variantId, { $set: Object.fromEntries(Object.entries(summary).map(([key, value]) => [`stockSummary.${key}`, value])) }, { new: true, runValidators: true, session });
        });
    },
};
