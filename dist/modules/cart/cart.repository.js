"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cartRepository = void 0;
const cart_model_1 = __importDefault(require("./cart.model"));
exports.cartRepository = {
    findByUser(userId) {
        return cart_model_1.default.findOne({ user: userId });
    },
    findPopulatedByUser(userId) {
        return cart_model_1.default.findOne({ user: userId })
            .populate("items.product")
            .populate("promoCode")
            .populate("delivery");
    },
    createForUser(userId) {
        return new cart_model_1.default({ user: userId, items: [] });
    },
};
