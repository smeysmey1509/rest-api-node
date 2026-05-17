"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wishlistRepository = void 0;
const wishlist_model_1 = __importDefault(require("./wishlist.model"));
const populateProducts = {
    path: "items.product",
    populate: [{ path: "brand" }, { path: "category" }, { path: "seller" }],
};
exports.wishlistRepository = {
    findByUser(userId) {
        return wishlist_model_1.default.findOne({ user: userId });
    },
    findPopulatedByUser(userId) {
        return wishlist_model_1.default.findOne({ user: userId }).populate(populateProducts);
    },
    createForUser(userId) {
        return new wishlist_model_1.default({ user: userId, items: [] });
    },
    populateProducts(doc) {
        return doc.populate(populateProducts);
    },
};
