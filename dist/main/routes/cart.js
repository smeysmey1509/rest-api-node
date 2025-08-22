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
exports.calculateCartSubtotal = void 0;
const express_1 = require("express");
const Cart_1 = __importDefault(require("../../models/Cart"));
const Product_1 = __importDefault(require("../../models/Product"));
const PromoCode_1 = __importDefault(require("../../models/PromoCode"));
const PromoUsage_1 = __importDefault(require("../../models/PromoUsage"));
const auth_1 = require("../../middleware/auth");
const cartTotals_1 = require("../utils/cartTotals");
const multer_1 = __importDefault(require("multer"));
const upload = (0, multer_1.default)();
const router = (0, express_1.Router)();
// Helper function to calculate subtotal from a populated cart
const calculateCartSubtotal = (cart) => {
    return cart.items.reduce((acc, item) => {
        var _a;
        const productPrice = ((_a = item.product) === null || _a === void 0 ? void 0 : _a.price) || 0;
        return acc + productPrice * item.quantity;
    }, 0);
};
exports.calculateCartSubtotal = calculateCartSubtotal;
// GET /api/v1/cart - Get user's cart
router.get("/cart", auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Cast cart to include timestamps
        const cart = yield Cart_1.default.findOne({ user: req.user.id })
            .populate("items.product")
            .populate("promoCode")
            .lean()
            .exec();
        if (cart) {
            const subtotal = (0, exports.calculateCartSubtotal)(cart);
            const { serviceTax, deliveryFee, total } = (0, cartTotals_1.calculateCartTotals)(subtotal, cart.discount || 0);
            // Update DB fields
            yield Cart_1.default.findByIdAndUpdate(cart._id, {
                subTotal: subtotal,
                serviceTax,
                deliveryFee,
                total,
            });
            // Send structured response
            res.status(200).json({
                _id: cart._id,
                user: cart.user,
                items: cart.items,
                promoCode: cart.promoCode,
                summary: {
                    subTotal: subtotal,
                    discount: cart.discount || 0,
                    deliveryFee,
                    serviceTax,
                    total,
                },
                createdAt: cart.createdAt,
                updatedAt: cart.updatedAt,
            });
            return;
        }
        res.status(200).json({ items: [], summary: {} });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch cart." });
    }
}));
// POST /api/v1/cart/add - Add product to cart
router.post("/cart/add", auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId, quantity } = req.body;
        const product = yield Product_1.default.findById(productId);
        if (!product) {
            res.status(404).json({ error: "Product not found." });
            return;
        }
        let cart = yield Cart_1.default.findOne({ user: req.user.id }).populate("items.product");
        if (!cart) {
            cart = new Cart_1.default({ user: req.user.id, items: [], subTotal: 0 });
        }
        const qty = quantity || 1;
        const itemIndex = cart.items.findIndex((item) => item.product.toString() === productId);
        if (itemIndex > -1) {
            // Increment existing quantity
            cart.items[itemIndex].quantity += qty;
        }
        else {
            cart.items.push({ product: productId, quantity: qty });
        }
        cart.subTotal = (cart.subTotal || 0) + product.price * qty;
        yield cart.save();
        res.status(200).json(cart);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to add to cart." });
    }
}));
// POST /api/v1/cart/remove - Remove product from cart
router.post("/cart/remove", auth_1.authenticateToken, upload.none(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Now productId will be in req.body.productId (string), parsed from form-data
        const { productId } = req.body;
        const cart = yield Cart_1.default.findOne({
            user: req.user.id,
        }).populate("items.product");
        if (!cart) {
            res.status(404).json({ error: "Cart not found." });
            return;
        }
        cart.items = cart.items.filter((item) => item.product.toString() !== productId.toString());
        cart.subTotal = (0, exports.calculateCartSubtotal)(cart);
        yield cart.save();
        res.status(200).json(cart);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to remove from cart." });
    }
}));
// POST /api/v1/cart/clear - Clear cart
router.post("/cart/clear", auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cart = yield Cart_1.default.findOne({ user: req.user.id }).populate("items.product");
        if (!cart) {
            res.status(404).json({ error: "Cart not found." });
            return;
        }
        cart.items = [];
        cart.subTotal = 0;
        yield cart.save();
        res.status(200).json({ msg: "Cart cleared." });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to clear cart." });
    }
}));
// PUT /api/v1/cart/update/:productId - Update quantity of product in cart
router.put("/cart/update/:productId", auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId } = req.params;
        const { quantity } = req.body;
        if (quantity < 1) {
            res.status(400).json({ error: "Quantity must be at least 1." });
            return;
        }
        const cart = yield Cart_1.default.findOne({ user: req.user.id });
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
        cart.subTotal = (0, exports.calculateCartSubtotal)(cart);
        yield cart.save();
        res.status(200).json(cart);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update cart quantity." });
    }
}));
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
        const cart = yield Cart_1.default.findOne({ user: req.user.id }).populate("items.product");
        if (!cart) {
            res.status(404).json({ error: "Cart not found." });
            return;
        }
        const subtotal = (0, exports.calculateCartSubtotal)(cart);
        let discountAmount = 0;
        if (promo.discountType === "percentage") {
            discountAmount = subtotal * (promo.discountValue / 100);
        }
        else {
            discountAmount = promo.discountValue;
        }
        // 🔹 Apply service tax & delivery fee
        const { serviceTax, deliveryFee, total } = (0, cartTotals_1.calculateCartTotals)(subtotal, discountAmount);
        cart.promoCode = promo._id;
        cart.discount = discountAmount;
        cart.subTotal = subtotal;
        cart.serviceTax = serviceTax;
        cart.deliveryFee = deliveryFee;
        cart.total = total;
        yield cart.save();
        yield cart.populate("promoCode");
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
// Remove promo code from cart
router.post("/cart/remove-promocode", auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Find user's cart
        const cart = yield Cart_1.default.findOne({ user: req.user.id }).populate("items.product");
        if (!cart) {
            res.status(404).json({ error: "Cart not found." });
            return;
        }
        // Reset promo fields
        cart.promoCode = null;
        cart.discount = 0;
        // Recalculate totals
        const subtotal = (0, exports.calculateCartSubtotal)(cart);
        const { serviceTax, deliveryFee, total } = (0, cartTotals_1.calculateCartTotals)(subtotal, 0);
        cart.subTotal = subtotal;
        cart.serviceTax = serviceTax;
        cart.deliveryFee = deliveryFee;
        cart.total = total;
        yield cart.save();
        // Return updated cart
        res.status(200).json({
            _id: cart._id,
            user: cart.user,
            items: cart.items,
            promoCode: null,
            summary: {
                subTotal: subtotal,
                discount: 0,
                deliveryFee: cart.deliveryFee,
                serviceTax: cart.serviceTax,
                total: cart.total,
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
exports.default = router;
