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
const express_1 = require("express");
const mongoose_1 = require("mongoose");
const Cart_1 = __importDefault(require("../../models/Cart"));
const DeliverySetting_1 = __importDefault(require("../../models/DeliverySetting"));
const Order_1 = __importDefault(require("../../models/Order"));
const auth_1 = require("../../middleware/auth");
const cartTotals_1 = require("../utils/cartTotals");
const cache_1 = require("../utils/cache");
const router = (0, express_1.Router)();
function normalizeAddress(payload) {
    var _a, _b;
    if (!payload)
        return undefined;
    const line1 = (_a = payload.line1) === null || _a === void 0 ? void 0 : _a.toString().trim();
    const country = (_b = payload.country) === null || _b === void 0 ? void 0 : _b.toString().trim();
    if (!line1 || !country) {
        throw new Error("Shipping address requires line1 and country.");
    }
    const normalized = {
        line1,
        country,
    };
    if (payload.fullName)
        normalized.fullName = payload.fullName.toString().trim();
    if (payload.phone)
        normalized.phone = payload.phone.toString().trim();
    if (payload.line2)
        normalized.line2 = payload.line2.toString().trim();
    if (payload.city)
        normalized.city = payload.city.toString().trim();
    if (payload.state)
        normalized.state = payload.state.toString().trim();
    if (payload.postalCode)
        normalized.postalCode = payload.postalCode.toString().trim();
    return normalized;
}
function resolveDelivery(cart, options) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const { methodId, method } = options;
        const byId = methodId
            ? yield DeliverySetting_1.default.findById(methodId).lean()
            : null;
        if (byId) {
            return {
                setting: byId._id,
                method: byId.method,
                baseFee: byId.baseFee,
                estimatedDays: byId.estimatedDays,
                code: byId.code,
            };
        }
        const byMethod = method
            ? yield DeliverySetting_1.default.findOne({ method, isActive: true }).lean()
            : null;
        if (byMethod) {
            return {
                setting: byMethod._id,
                method: byMethod.method,
                baseFee: byMethod.baseFee,
                estimatedDays: byMethod.estimatedDays,
                code: byMethod.code,
            };
        }
        const populated = cart === null || cart === void 0 ? void 0 : cart.delivery;
        if (populated && populated.method) {
            const rawId = (_b = (_a = populated._id) !== null && _a !== void 0 ? _a : populated.id) !== null && _b !== void 0 ? _b : null;
            const normalizedId = rawId instanceof mongoose_1.Types.ObjectId
                ? rawId
                : typeof rawId === "string" && mongoose_1.Types.ObjectId.isValid(rawId)
                    ? new mongoose_1.Types.ObjectId(rawId)
                    : null;
            return {
                setting: normalizedId,
                method: populated.method,
                baseFee: populated.baseFee,
                estimatedDays: populated.estimatedDays,
                code: populated.code,
            };
        }
        const existingId = cart === null || cart === void 0 ? void 0 : cart.delivery;
        if (existingId && mongoose_1.Types.ObjectId.isValid(existingId)) {
            const doc = yield DeliverySetting_1.default.findById(existingId).lean();
            if (doc) {
                return {
                    setting: doc._id,
                    method: doc.method,
                    baseFee: doc.baseFee,
                    estimatedDays: doc.estimatedDays,
                    code: doc.code,
                };
            }
        }
        const fallback = yield DeliverySetting_1.default.findOne({ isActive: true }).lean();
        if (!fallback)
            return undefined;
        return {
            setting: fallback._id,
            method: fallback.method,
            baseFee: fallback.baseFee,
            estimatedDays: fallback.estimatedDays,
            code: fallback.code,
        };
    });
}
router.post("/checkout", auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const body = req.body;
    try {
        const cart = yield Cart_1.default.findOne({ user: req.user.id })
            .populate("items.product")
            .populate("promoCode")
            .populate("delivery");
        if (!cart || cart.items.length === 0) {
            res.status(400).json({ error: "Cart is empty." });
            return;
        }
        const delivery = yield resolveDelivery(cart, {
            methodId: body.deliveryMethodId,
            method: body.deliveryMethod,
        });
        if (!delivery) {
            res
                .status(400)
                .json({ error: "No delivery methods are currently available." });
            return;
        }
        const items = cart.items.map((item) => {
            const productDoc = item.product;
            return {
                rawProduct: productDoc,
                quantity: item.quantity,
            };
        });
        for (const { rawProduct, quantity } of items) {
            if (!rawProduct || rawProduct.isDeleted) {
                res.status(400).json({ error: "One of the products is unavailable." });
                return;
            }
            if (typeof rawProduct.stock === "number" && rawProduct.stock < quantity) {
                res.status(400).json({
                    error: `Not enough stock for ${rawProduct.name}.`,
                });
                return;
            }
        }
        const subTotal = cart.items.reduce((acc, item) => {
            var _a;
            const price = ((_a = item.product) === null || _a === void 0 ? void 0 : _a.price) || 0;
            return acc + price * item.quantity;
        }, 0);
        const discount = cart.discount || 0;
        const deliveryMethod = delivery.method || "standard";
        const { serviceTax, deliveryFee, total } = yield (0, cartTotals_1.calculateCartTotals)(subTotal, discount, deliveryMethod);
        const shippingAddress = normalizeAddress(body.shippingAddress);
        const order = new Order_1.default({
            user: req.user.id,
            items: cart.items.map((item) => {
                const productDoc = item.product;
                return {
                    product: productDoc._id,
                    name: productDoc.name,
                    slug: productDoc.slug,
                    image: Array.isArray(productDoc.images)
                        ? productDoc.images[0]
                        : undefined,
                    price: productDoc.price,
                    quantity: item.quantity,
                };
            }),
            subTotal,
            discount,
            deliveryFee,
            serviceTax,
            total,
            status: "pending",
            payment: {
                method: ((_a = body.paymentMethod) === null || _a === void 0 ? void 0 : _a.toString().trim()) || undefined,
                status: body.paymentStatus || "pending",
                transactionId: ((_b = body.transactionId) === null || _b === void 0 ? void 0 : _b.toString().trim()) || undefined,
            },
            shippingAddress,
            delivery,
            promoCode: cart.promoCode && typeof cart.promoCode._id !== "undefined"
                ? cart.promoCode._id
                : cart.promoCode || null,
            notes: ((_c = body.notes) === null || _c === void 0 ? void 0 : _c.toString().trim()) || undefined,
        });
        yield order.save();
        for (const { rawProduct, quantity } of items) {
            if (typeof rawProduct.stock === "number") {
                rawProduct.stock = Math.max(0, rawProduct.stock - quantity);
            }
            if (typeof rawProduct.salesCount === "number") {
                rawProduct.salesCount += quantity;
            }
            else {
                rawProduct.salesCount = quantity;
            }
            yield rawProduct.save();
        }
        cart.items = [];
        cart.subTotal = 0;
        cart.discount = 0;
        cart.serviceTax = 0;
        cart.deliveryFee = 0;
        cart.total = 0;
        cart.promoCode = null;
        cart.delivery = ((_d = delivery.setting) !== null && _d !== void 0 ? _d : null);
        yield cart.save();
        const emptyCartPayload = {
            items: [],
            promoCode: null,
            delivery: cart.delivery,
            summary: {
                subTotal: 0,
                discount: 0,
                deliveryFee: 0,
                serviceTax: 0,
                total: 0,
                promoCode: null,
                promo: null,
            },
        };
        yield (0, cache_1.setCachedCart)(req.user.id, emptyCartPayload);
        yield (0, cache_1.invalidateCart)(req.user.id);
        const plainOrder = order.toObject({ virtuals: false });
        delete plainOrder.__v;
        res.status(201).json({
            message: "Order placed successfully.",
            order: plainOrder,
        });
    }
    catch (err) {
        console.error(err);
        if (err instanceof Error && err.message.includes("Shipping address")) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.status(500).json({ error: "Failed to complete checkout." });
    }
}));
exports.default = router;
