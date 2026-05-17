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
exports.wishlistService = void 0;
const product_model_1 = __importDefault(require("../products/product.model"));
const app_error_1 = require("../../shared/errors/app-error");
const wishlist_repository_1 = require("./wishlist.repository");
const cart_service_1 = require("../cart/cart.service");
exports.wishlistService = {
    get(userId, query) {
        return __awaiter(this, void 0, void 0, function* () {
            const page = Math.max(parseInt(String(query.page || "1"), 10), 1);
            const limit = Math.max(parseInt(String(query.limit || "10"), 10), 1);
            const skip = (page - 1) * limit;
            const wishlist = yield wishlist_repository_1.wishlistRepository.findPopulatedByUser(userId).lean();
            if (!wishlist) {
                return { items: [], totalItems: 0, totalPages: 0, currentPage: page };
            }
            const validItems = wishlist.items.filter((item) => item.product !== null);
            return {
                items: validItems.slice(skip, skip + limit),
                totalItems: validItems.length,
                totalPages: Math.ceil(validItems.length / limit),
                currentPage: page,
                hasNextPage: skip + limit < validItems.length,
                hasPrevPage: page > 1,
            };
        });
    },
    add(userId, productId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!productId)
                throw new app_error_1.AppError("Product ID is required.", 400);
            const product = yield product_model_1.default.findById(productId);
            if (!product)
                throw new app_error_1.AppError("Product not found.", 404);
            let wishlist = yield wishlist_repository_1.wishlistRepository.findByUser(userId);
            if (!wishlist)
                wishlist = wishlist_repository_1.wishlistRepository.createForUser(userId);
            const alreadySaved = wishlist.items.some((item) => String(item.product) === String(productId));
            if (alreadySaved) {
                throw new app_error_1.AppError("Product already exists in wishlist.", 409, "DUPLICATE_WISHLIST_ITEM");
            }
            wishlist.items.push({ product: productId });
            yield wishlist.save();
            yield wishlist_repository_1.wishlistRepository.populateProducts(wishlist);
            return { message: "Product added to wishlist successfully.", wishlist: wishlist.toObject() };
        });
    },
    remove(userId, productId) {
        return __awaiter(this, void 0, void 0, function* () {
            const wishlist = yield wishlist_repository_1.wishlistRepository.findByUser(userId);
            if (!wishlist)
                throw new app_error_1.AppError("Wishlist not found.", 404);
            const hadProduct = wishlist.items.some((item) => String(item.product) === String(productId));
            if (!hadProduct)
                throw new app_error_1.AppError("Product not found in wishlist.", 404);
            wishlist.items = wishlist.items.filter((item) => String(item.product) !== String(productId));
            yield wishlist.save();
            yield wishlist_repository_1.wishlistRepository.populateProducts(wishlist);
            return { message: "Product removed from wishlist.", wishlist: wishlist.toObject() };
        });
    },
    moveToCart(userId_1, productId_1) {
        return __awaiter(this, arguments, void 0, function* (userId, productId, quantity = 1) {
            const removed = yield this.remove(userId, productId);
            const cart = yield cart_service_1.cartService.add(userId, productId, quantity);
            return { message: "Moved product to cart.", wishlist: removed.wishlist, cart };
        });
    },
};
