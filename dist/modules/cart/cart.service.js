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
exports.cartService = exports.buildCartResponse = void 0;
const product_model_1 = __importDefault(require("../products/product.model"));
const PromoCode_1 = __importDefault(require("../../models/PromoCode"));
const PromoUsage_1 = __importDefault(require("../../models/PromoUsage"));
const DeliverySetting_1 = __importDefault(require("../../models/DeliverySetting"));
const cartTotals_1 = require("../../main/utils/cartTotals");
const cache_1 = require("../../main/utils/cache");
const cartSanitizer_1 = require("../../main/utils/cartSanitizer");
const appError_1 = require("../../common/utils/appError");
const cart_repository_1 = require("./cart.repository");
const subtotalFromCart = (cart) => (cart.items || []).reduce((acc, item) => {
    var _a;
    const price = ((_a = item.product) === null || _a === void 0 ? void 0 : _a.price) || 0;
    return acc + price * item.quantity;
}, 0);
const computeTaxRate = (subTotal, discount, serviceTax) => {
    const taxableBase = Math.max(subTotal - discount, 0);
    if (taxableBase <= 0)
        return 0;
    return Number((serviceTax / taxableBase).toFixed(4));
};
const buildPromoSummary = (promo, discountAmount) => {
    var _a, _b;
    if (!promo)
        return null;
    const promoDoc = typeof (promo === null || promo === void 0 ? void 0 : promo.toObject) === "function" ? promo.toObject() : promo;
    const code = typeof promoDoc === "string" ? promoDoc : (_b = (_a = promoDoc === null || promoDoc === void 0 ? void 0 : promoDoc.code) !== null && _a !== void 0 ? _a : promoDoc === null || promoDoc === void 0 ? void 0 : promoDoc.Code) !== null && _b !== void 0 ? _b : null;
    if (!code)
        return null;
    return {
        code,
        type: promoDoc === null || promoDoc === void 0 ? void 0 : promoDoc.discountType,
        value: promoDoc === null || promoDoc === void 0 ? void 0 : promoDoc.discountValue,
        maxUsesPerUser: promoDoc === null || promoDoc === void 0 ? void 0 : promoDoc.maxUsesPerUser,
        expiresAt: promoDoc === null || promoDoc === void 0 ? void 0 : promoDoc.expiresAt,
        amount: Number(discountAmount || 0),
    };
};
const resolveDeliveryMethod = (cart) => __awaiter(void 0, void 0, void 0, function* () {
    const chosen = cart === null || cart === void 0 ? void 0 : cart.delivery;
    if (chosen === null || chosen === void 0 ? void 0 : chosen.method)
        return String(chosen.method).toLowerCase();
    const active = yield DeliverySetting_1.default.findOne({ isActive: true }).lean();
    return String((active === null || active === void 0 ? void 0 : active.method) || "standard").toLowerCase();
});
const buildCartResponse = (cartDoc) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    yield cartDoc.populate("items.product");
    yield cartDoc.populate("promoCode");
    yield cartDoc.populate("delivery");
    const deliveryDoc = cartDoc.delivery ||
        (yield DeliverySetting_1.default.findOne({ isActive: true }).lean()) || {
        _id: null,
        method: "standard",
        baseFee: 0,
        taxRate: 0,
    };
    const subTotal = subtotalFromCart(cartDoc);
    const discount = cartDoc.discount || 0;
    const hasItems = Array.isArray(cartDoc.items) && cartDoc.items.length > 0;
    if (!hasItems || subTotal <= 0) {
        cartDoc.subTotal = 0;
        cartDoc.discount = 0;
        cartDoc.serviceTax = 0;
        cartDoc.deliveryFee = 0;
        cartDoc.total = 0;
        cartDoc.promoCode = null;
        yield cartDoc.save();
        return {
            _id: cartDoc._id,
            user: cartDoc.user,
            items: (0, cartSanitizer_1.sanitizeCartItems)(cartDoc.items),
            promoCode: null,
            delivery: deliveryDoc,
            summary: {
                subTotal: 0,
                discount: 0,
                deliveryFee: 0,
                serviceTax: 0,
                total: 0,
                taxRate: 0,
                promoCode: null,
                promo: null,
            },
            createdAt: cartDoc.createdAt,
            updatedAt: cartDoc.updatedAt,
        };
    }
    const method = String(deliveryDoc.method || "standard").toLowerCase();
    const { serviceTax, deliveryFee, total } = yield (0, cartTotals_1.calculateCartTotals)(subTotal, discount, method);
    const promoSummary = buildPromoSummary(cartDoc.promoCode, discount);
    const taxRate = computeTaxRate(subTotal, discount, serviceTax);
    cartDoc.subTotal = subTotal;
    cartDoc.serviceTax = serviceTax;
    cartDoc.deliveryFee = deliveryFee;
    cartDoc.total = total;
    yield cartDoc.save();
    return {
        _id: cartDoc._id,
        user: cartDoc.user,
        items: (0, cartSanitizer_1.sanitizeCartItems)(cartDoc.items),
        promoCode: cartDoc.promoCode,
        delivery: deliveryDoc,
        summary: {
            subTotal,
            discount,
            deliveryFee,
            serviceTax,
            total,
            taxRate,
            promoCode: (_a = promoSummary === null || promoSummary === void 0 ? void 0 : promoSummary.code) !== null && _a !== void 0 ? _a : null,
            promo: promoSummary,
        },
        createdAt: cartDoc.createdAt,
        updatedAt: cartDoc.updatedAt,
    };
});
exports.buildCartResponse = buildCartResponse;
exports.cartService = {
    get(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const cart = yield cart_repository_1.cartRepository.findPopulatedByUser(userId);
            if (!cart) {
                return {
                    items: [],
                    promoCode: null,
                    delivery: null,
                    summary: {
                        subTotal: 0,
                        discount: 0,
                        deliveryFee: 0,
                        serviceTax: 0,
                        total: 0,
                        taxRate: 0,
                        promoCode: null,
                        promo: null,
                    },
                };
            }
            const response = yield (0, exports.buildCartResponse)(cart);
            yield (0, cache_1.setCachedCart)(userId, response);
            return response;
        });
    },
    add(userId_1, productId_1) {
        return __awaiter(this, arguments, void 0, function* (userId, productId, quantity = 1) {
            const product = yield product_model_1.default.findById(productId);
            if (!product)
                throw new appError_1.AppError("Product not found.", 404);
            let cart = yield cart_repository_1.cartRepository.findByUser(userId);
            if (!cart)
                cart = cart_repository_1.cartRepository.createForUser(userId);
            const safeQuantity = Math.max(1, Number(quantity) || 1);
            const idx = cart.items.findIndex((item) => String(item.product) === String(productId));
            if (idx > -1)
                cart.items[idx].quantity += safeQuantity;
            else
                cart.items.push({ product: productId, quantity: safeQuantity });
            yield cart.save();
            const response = yield (0, exports.buildCartResponse)(cart);
            yield (0, cache_1.setCachedCart)(userId, response);
            return response;
        });
    },
    remove(userId, productId) {
        return __awaiter(this, void 0, void 0, function* () {
            const cart = yield cart_repository_1.cartRepository.findByUser(userId);
            if (!cart)
                throw new appError_1.AppError("Cart not found.", 404);
            cart.items = cart.items.filter((item) => String(item.product) !== String(productId));
            yield cart.save();
            const response = yield (0, exports.buildCartResponse)(cart);
            yield (0, cache_1.setCachedCart)(userId, response);
            return response;
        });
    },
    updateQuantity(userId, productId, quantity) {
        return __awaiter(this, void 0, void 0, function* () {
            if (quantity < 1)
                throw new appError_1.AppError("Quantity must be at least 1.", 400);
            const cart = yield cart_repository_1.cartRepository.findByUser(userId);
            if (!cart)
                throw new appError_1.AppError("Cart not found.", 404);
            const item = cart.items.find((cartItem) => String(cartItem.product) === String(productId));
            if (!item)
                throw new appError_1.AppError("Product not found in cart.", 404);
            item.quantity = quantity;
            yield cart.save();
            yield (0, cache_1.invalidateCart)(userId);
            return (0, exports.buildCartResponse)(cart);
        });
    },
    clear(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const cart = yield cart_repository_1.cartRepository.findByUser(userId);
            if (!cart)
                throw new appError_1.AppError("Cart not found.", 404);
            cart.items = [];
            cart.discount = 0;
            cart.promoCode = null;
            cart.subTotal = 0;
            cart.serviceTax = 0;
            cart.deliveryFee = 0;
            cart.total = 0;
            yield cart.save();
            yield (0, cache_1.invalidateCart)(userId);
            return { msg: "Cart cleared." };
        });
    },
    applyPromo(userId, code) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (!code)
                throw new appError_1.AppError("Promo code is required.", 400);
            const promo = yield PromoCode_1.default.findOne({ code: code.toUpperCase(), isActive: true });
            if (!promo)
                throw new appError_1.AppError("Promo code not found or inactive.", 404);
            if (promo.expiresAt < new Date())
                throw new appError_1.AppError("Promo code has expired.", 400);
            const usage = yield PromoUsage_1.default.findOne({ user: userId, promoCode: promo._id });
            if (usage && usage.usageCount >= promo.maxUsesPerUser) {
                throw new appError_1.AppError(`Promo code usage limit reached (${promo.maxUsesPerUser} times).`, 400);
            }
            const cart = yield cart_repository_1.cartRepository.findPopulatedByUser(userId);
            if (!cart)
                throw new appError_1.AppError("Cart not found.", 404);
            const subtotal = subtotalFromCart(cart);
            const discountAmount = promo.discountType === "percentage"
                ? subtotal * (promo.discountValue / 100)
                : promo.discountValue;
            const method = yield resolveDeliveryMethod(cart);
            const { serviceTax, deliveryFee, total } = yield (0, cartTotals_1.calculateCartTotals)(subtotal, discountAmount, method);
            cart.promoCode = promo._id;
            cart.discount = discountAmount;
            cart.subTotal = subtotal;
            cart.serviceTax = serviceTax;
            cart.deliveryFee = deliveryFee;
            cart.total = total;
            yield cart.save();
            yield (0, cache_1.invalidateCart)(userId);
            return {
                success: true,
                message: "Promo code applied successfully.",
                promo: {
                    code: promo.code,
                    type: promo.discountType,
                    value: promo.discountValue,
                    amount: discountAmount,
                    usageCount: (_a = usage === null || usage === void 0 ? void 0 : usage.usageCount) !== null && _a !== void 0 ? _a : 0,
                    maxUsesPerUser: promo.maxUsesPerUser,
                    expiresAt: promo.expiresAt,
                },
            };
        });
    },
    removePromo(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const cart = yield cart_repository_1.cartRepository.findPopulatedByUser(userId);
            if (!cart)
                throw new appError_1.AppError("Cart not found.", 404);
            cart.promoCode = null;
            cart.discount = 0;
            yield cart.save();
            yield (0, cache_1.invalidateCart)(userId);
            return (0, exports.buildCartResponse)(cart);
        });
    },
    selectDelivery(userId, method) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!method)
                throw new appError_1.AppError("Delivery method is required.", 400);
            const delivery = yield DeliverySetting_1.default.findOne({ method, isActive: true });
            if (!delivery)
                throw new appError_1.AppError("Delivery method not found.", 404);
            const cart = yield cart_repository_1.cartRepository.findByUser(userId);
            if (!cart)
                throw new appError_1.AppError("Cart not found.", 404);
            cart.delivery = delivery._id;
            yield cart.save();
            yield (0, cache_1.invalidateCart)(userId);
            return (0, exports.buildCartResponse)(cart);
        });
    },
};
