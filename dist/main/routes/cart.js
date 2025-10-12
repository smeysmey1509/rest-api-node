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
const Cart_1 = __importDefault(require("../../models/Cart"));
const Product_1 = __importDefault(require("../../models/Product"));
const PromoCode_1 = __importDefault(require("../../models/PromoCode"));
const PromoUsage_1 = __importDefault(require("../../models/PromoUsage"));
const DeliverySetting_1 = __importDefault(require("../../models/DeliverySetting"));
const auth_1 = require("../../middleware/auth");
const cartTotals_1 = require("../utils/cartTotals");
const multer_1 = __importDefault(require("multer"));
const cache_1 = require("../utils/cache");
const upload = (0, multer_1.default)();
const router = (0, express_1.Router)();
// helper: compute subtotal from an already populated cart
const subtotalFromCart = (cart) => {
    return cart.items.reduce((acc, item) => {
        var _a;
        const price = ((_a = item.product) === null || _a === void 0 ? void 0 : _a.price) || 0;
        return acc + price * item.quantity;
    }, 0);
};
// helper: chosen delivery method (lowercase), defaulting to active isActive=true or "standard"
function resolveDeliveryMethod(cart) {
    return __awaiter(this, void 0, void 0, function* () {
        // if cart has populated delivery with a method, prefer that
        const chosen = cart === null || cart === void 0 ? void 0 : cart.delivery;
        if (chosen === null || chosen === void 0 ? void 0 : chosen.method)
            return String(chosen.method).toLowerCase();
        // otherwise use the active default
        const active = yield DeliverySetting_1.default.findOne({ isActive: true }).lean();
        return String((active === null || active === void 0 ? void 0 : active.method) || "standard").toLowerCase();
    });
}
// builds the same shape returned by GET /cart
function buildCartResponse(cartDoc) {
    return __awaiter(this, void 0, void 0, function* () {
        yield cartDoc.populate("items.product");
        // prefer the cart’s delivery; else a safe default
        let deliveryDoc = cartDoc.delivery ||
            (yield DeliverySetting_1.default.findOne({ isActive: true }).lean()) ||
            { _id: null, method: "standard", fee: 0, taxRate: 0 };
        const subTotal = cartDoc.items.reduce((acc, item) => {
            var _a;
            const price = ((_a = item.product) === null || _a === void 0 ? void 0 : _a.price) || 0;
            return acc + price * item.quantity;
        }, 0);
        const method = String(deliveryDoc.method || "standard").toLowerCase();
        const { serviceTax, deliveryFee, total } = yield (0, cartTotals_1.calculateCartTotals)(subTotal, cartDoc.discount || 0, method);
        const response = {
            _id: cartDoc._id,
            user: cartDoc.user,
            items: cartDoc.items,
            promoCode: cartDoc.promoCode,
            delivery: deliveryDoc,
            summary: {
                subTotal,
                discount: cartDoc.discount || 0,
                deliveryFee,
                serviceTax,
                total,
            },
            createdAt: cartDoc.createdAt,
            updatedAt: cartDoc.updatedAt,
        };
        // best‑effort background sync of computed totals
        void Cart_1.default.findByIdAndUpdate(cartDoc._id, {
            subTotal: response.summary.subTotal,
            serviceTax: response.summary.serviceTax,
            deliveryFee: response.summary.deliveryFee,
            total: response.summary.total,
        });
        return response;
    });
}
// GET /api/v1/cart - Get user's cart (now includes delivery + correct totals)
router.get("/cart", auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // A) Cache fast-path
        const cached = yield (0, cache_1.getCachedCart)(req.user.id);
        if (cached) {
            // helpful debug:
            // console.log("[/cart] cache HIT", req.user.id);
            res.status(200).json(cached);
            return;
        }
        // console.log("[/cart] cache MISS", req.user.id);
        // B) Load cart lean (populated docs are also plain because of lean())
        const cart = yield Cart_1.default.findOne({ user: req.user.id })
            .populate("items.product")
            .populate("promoCode")
            .populate("delivery")
            .lean()
            .exec();
        if (!cart) {
            const empty = {
                items: [],
                promoCode: null,
                delivery: null,
                summary: {
                    subTotal: 0,
                    discount: 0,
                    deliveryFee: 0,
                    serviceTax: 0,
                    total: 0,
                },
            };
            yield (0, cache_1.setCachedCart)(req.user.id, empty);
            res.status(200).json(empty);
            return;
        }
        // C) Prefer cart.delivery; else safe default (no 404)
        let deliveryDoc = cart.delivery ||
            (yield DeliverySetting_1.default.findOne({ isActive: true }).lean());
        if (!deliveryDoc) {
            // safe default to keep GET working even if DB is empty
            deliveryDoc = { _id: null, method: "standard", fee: 0, taxRate: 0 };
        }
        // D) Totals computed with the SAME delivery we return
        const subTotal = subtotalFromCart(cart);
        const method = String(deliveryDoc.method || "standard").toLowerCase();
        const { serviceTax, deliveryFee, total } = yield (0, cartTotals_1.calculateCartTotals)(subTotal, cart.discount || 0, method);
        // best-effort DB sync (don’t block the response if it fails)
        void Cart_1.default.findByIdAndUpdate(cart._id, {
            subTotal,
            serviceTax,
            deliveryFee,
            total,
        });
        const response = {
            _id: cart._id,
            user: cart.user,
            items: cart.items,
            promoCode: cart.promoCode,
            delivery: deliveryDoc,
            summary: {
                subTotal,
                discount: cart.discount || 0,
                deliveryFee,
                serviceTax,
                total,
            },
            createdAt: cart.createdAt,
            updatedAt: cart.updatedAt,
        };
        // E) Write-through cache so next GET is instant
        yield (0, cache_1.setCachedCart)(req.user.id, response);
        res.status(200).json(response);
        return;
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch cart." });
        return;
    }
}));
// POST /api/v1/cart/add - Add product to cart (recompute totals with chosen delivery)
router.post("/cart/add", auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId, quantity } = req.body;
        const product = yield Product_1.default.findById(productId);
        if (!product) {
            res.status(404).json({ error: "Product not found." });
            return;
        }
        let cart = yield Cart_1.default.findOne({ user: req.user.id }).populate("delivery");
        if (!cart)
            cart = new Cart_1.default({ user: req.user.id, items: [] });
        const idx = cart.items.findIndex((it) => it.product.toString() === productId);
        if (idx > -1)
            cart.items[idx].quantity += quantity || 1;
        else
            cart.items.push({ product: productId, quantity: quantity || 1 });
        // recompute totals
        yield cart.populate("items.product");
        const subtotal = subtotalFromCart(cart);
        const method = yield resolveDeliveryMethod(cart);
        const { serviceTax, deliveryFee, total } = yield (0, cartTotals_1.calculateCartTotals)(subtotal, cart.discount || 0, method);
        cart.subTotal = subtotal;
        cart.serviceTax = serviceTax;
        cart.deliveryFee = deliveryFee;
        cart.total = total;
        yield cart.save();
        const response = yield buildCartResponse(cart);
        yield (0, cache_1.setCachedCart)(req.user.id, response);
        res.status(200).json(response);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to add to cart." });
    }
}));
// POST /api/v1/cart/remove
router.post("/cart/remove", auth_1.authenticateToken, upload.none(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId } = req.body;
        const cart = yield Cart_1.default.findOne({ user: req.user.id }).populate("delivery");
        if (!cart) {
            res.status(404).json({ error: "Cart not found." });
            return;
        }
        cart.items = cart.items.filter((it) => it.product.toString() !== String(productId));
        yield cart.populate("items.product");
        const subtotal = subtotalFromCart(cart);
        const method = yield resolveDeliveryMethod(cart);
        const { serviceTax, deliveryFee, total } = yield (0, cartTotals_1.calculateCartTotals)(subtotal, cart.discount || 0, method);
        cart.subTotal = subtotal;
        cart.serviceTax = serviceTax;
        cart.deliveryFee = deliveryFee;
        cart.total = total;
        yield cart.save();
        const response = yield buildCartResponse(cart);
        yield (0, cache_1.setCachedCart)(req.user.id, response);
        res.status(200).json(response);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to remove from cart." });
    }
}));
// POST /api/v1/cart/clear
router.post("/cart/clear", auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cart = yield Cart_1.default.findOne({ user: req.user.id }).populate("delivery");
        if (!cart) {
            res.status(404).json({ error: "Cart not found." });
            return;
        }
        cart.items = [];
        const subtotal = 0;
        const method = yield resolveDeliveryMethod(cart);
        const { serviceTax, deliveryFee, total } = yield (0, cartTotals_1.calculateCartTotals)(subtotal, 0, method);
        cart.subTotal = subtotal;
        cart.discount = 0;
        cart.promoCode = null;
        cart.serviceTax = serviceTax;
        cart.deliveryFee = deliveryFee;
        cart.total = total;
        yield cart.save();
        yield (0, cache_1.invalidateCart)(req.user.id);
        res.status(200).json({ msg: "Cart cleared." });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to clear cart." });
    }
}));
// PUT /api/v1/cart/update/:productId
router.put("/cart/update/:productId", auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId } = req.params;
        const { quantity } = req.body;
        if (quantity < 1) {
            res.status(400).json({ error: "Quantity must be at least 1." });
            return;
        }
        const cart = yield Cart_1.default.findOne({ user: req.user.id }).populate("delivery");
        if (!cart) {
            res.status(404).json({ error: "Cart not found." });
            return;
        }
        const item = cart.items.find((i) => i.product.toString() === productId);
        if (!item) {
            res.status(404).json({ error: "Product not found in cart." });
            return;
        }
        item.quantity = quantity;
        yield cart.populate("items.product");
        const subtotal = subtotalFromCart(cart);
        const method = yield resolveDeliveryMethod(cart);
        const { serviceTax, deliveryFee, total } = yield (0, cartTotals_1.calculateCartTotals)(subtotal, cart.discount || 0, method);
        cart.subTotal = subtotal;
        cart.serviceTax = serviceTax;
        cart.deliveryFee = deliveryFee;
        cart.total = total;
        yield cart.save();
        yield (0, cache_1.invalidateCart)(req.user.id);
        res.status(200).json(cart);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update cart quantity." });
    }
}));
// POST /api/v1/cart/apply-promo
router.post("/cart/apply-promo", auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { code } = req.body;
        if (!code) {
            res.status(400).json({ error: "Promo code is required." });
            return;
        }
        const promo = yield PromoCode_1.default.findOne({
            code: code.toUpperCase(),
            isActive: true,
        });
        if (!promo) {
            res.status(404).json({ error: "Promo code not found or inactive." });
            return;
        }
        if (promo.expiresAt < new Date()) {
            res.status(400).json({ error: "Promo code has expired." });
            return;
        }
        let usage = yield PromoUsage_1.default.findOne({
            user: req.user.id,
            promoCode: promo._id,
        });
        if (usage) {
            if (usage.usageCount >= promo.maxUsesPerUser) {
                res.status(400).json({
                    error: `Promo code usage limit reached (${promo.maxUsesPerUser} times).`,
                });
                return;
            }
            usage.usageCount += 1;
        }
        else {
            usage = new PromoUsage_1.default({
                user: req.user.id,
                promoCode: promo._id,
                usageCount: 1,
            });
        }
        yield usage.save();
        const cart = yield Cart_1.default.findOne({ user: req.user.id })
            .populate("items.product")
            .populate("delivery");
        if (!cart) {
            res.status(404).json({ error: "Cart not found." });
            return;
        }
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
        yield cart.populate("promoCode");
        yield (0, cache_1.invalidateCart)(req.user.id);
        res.status(200).json({
            success: true,
            message: "Promo code applied successfully.",
            promo: {
                code: promo.code,
                type: promo.discountType,
                value: promo.discountValue,
                amount: discountAmount,
                usageCount: usage.usageCount,
                maxUsesPerUser: promo.maxUsesPerUser,
                expiresAt: promo.expiresAt,
            },
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to apply promo code." });
    }
}));
// POST /api/v1/cart/remove-promocode
router.post("/cart/remove-promocode", auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cart = yield Cart_1.default.findOne({ user: req.user.id })
            .populate("items.product")
            .populate("delivery");
        if (!cart) {
            res.status(404).json({ error: "Cart not found." });
            return;
        }
        cart.promoCode = null;
        cart.discount = 0;
        const subtotal = subtotalFromCart(cart);
        const method = yield resolveDeliveryMethod(cart);
        const { serviceTax, deliveryFee, total } = yield (0, cartTotals_1.calculateCartTotals)(subtotal, 0, method);
        cart.subTotal = subtotal;
        cart.serviceTax = serviceTax;
        cart.deliveryFee = deliveryFee;
        cart.total = total;
        yield cart.save();
        yield (0, cache_1.invalidateCart)(req.user.id);
        res.status(200).json({
            _id: cart._id,
            user: cart.user,
            items: cart.items,
            promoCode: null,
            summary: {
                subTotal: subtotal,
                discount: 0,
                deliveryFee,
                serviceTax,
                total,
            },
            createdAt: cart.createdAt,
            updatedAt: cart.updatedAt,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to remove promo code." });
    }
}));
// POST /api/v1/cart/select-delivery
router.post("/cart/select-delivery", auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { method } = req.body;
        if (!method) {
            res.status(400).json({ error: "Delivery method is required." });
            return;
        }
        const delivery = yield DeliverySetting_1.default.findOne({
            method,
            isActive: true,
        });
        if (!delivery) {
            res.status(404).json({ error: "Delivery method not found." });
            return;
        }
        const cart = yield Cart_1.default.findOne({ user: req.user.id }).populate("items.product");
        if (!cart) {
            res.status(404).json({ error: "Cart not found." });
            return;
        }
        cart.delivery = delivery._id;
        yield cart.save();
        yield cart.populate("delivery");
        yield (0, cache_1.invalidateCart)(req.user.id);
        res.status(200).json({
            _id: cart._id,
            user: cart.user,
            delivery: cart.delivery,
            createdAt: cart.createdAt,
            updatedAt: cart.updatedAt,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to select delivery method." });
    }
}));
exports.default = router;
