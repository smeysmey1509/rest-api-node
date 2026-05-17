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
exports.calculateCartTotals = calculateCartTotals;
const delivery_setting_model_1 = __importDefault(require("../../modules/inventory/delivery-setting.model"));
function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function calculateCartTotals(subtotal, discount, method) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const normalizedMethod = (method || "").trim();
        const methodQuery = normalizedMethod.length > 0
            ? {
                $regex: new RegExp(`^${escapeRegex(normalizedMethod)}$`, "i"),
            }
            : undefined;
        const delivery = yield delivery_setting_model_1.default.findOne(Object.assign(Object.assign({}, (methodQuery ? { method: methodQuery } : {})), { isActive: true }));
        const sanitizedSubtotal = Math.max(0, subtotal);
        const discountAmount = Math.max(0, discount || 0);
        const discountedSubtotal = Math.max(0, sanitizedSubtotal - discountAmount);
        let deliveryFee = 0;
        if (delivery) {
            const threshold = (_a = delivery.freeThreshold) !== null && _a !== void 0 ? _a : null;
            const baseFee = (_b = delivery.baseFee) !== null && _b !== void 0 ? _b : 0;
            const qualifiesForFree = threshold !== null && baseFee <= 0 && discountedSubtotal >= threshold;
            deliveryFee = qualifiesForFree ? 0 : baseFee;
        }
        const serviceTax = Number((sanitizedSubtotal * 0.1).toFixed(2));
        const total = Number((discountedSubtotal + deliveryFee + serviceTax).toFixed(2));
        return { serviceTax, deliveryFee, total };
    });
}
