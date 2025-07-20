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
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/v1/cart - Get user's cart
router.get("/cart", auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cart = yield Cart_1.default.findOne({ user: req.user.id }).populate("items.product");
        res.status(200).json(cart || { items: [] });
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
        let cart = yield Cart_1.default.findOne({ user: req.user.id });
        if (!cart) {
            cart = new Cart_1.default({ user: req.user.id, items: [] });
        }
        const itemIndex = cart.items.findIndex((item) => item.product.toString() === productId);
        if (itemIndex > -1) {
            // Increment existing quantity
            cart.items[itemIndex].quantity += quantity || 1;
        }
        else {
            cart.items.push({ product: productId, quantity: quantity || 1 });
        }
        yield cart.save();
        res.status(200).json(cart);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to add to cart." });
    }
}));
// POST /api/v1/cart/remove - Remove product from cart
router.post("/cart/remove", auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId } = req.body;
        const cart = yield Cart_1.default.findOne({ user: req.user.id });
        if (!cart) {
            res.status(404).json({ error: "Cart not found." });
            return;
        }
        cart.items = cart.items.filter((item) => item.product.toString() !== productId);
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
        const cart = yield Cart_1.default.findOne({ user: req.user.id });
        if (!cart) {
            res.status(404).json({ error: "Cart not found." });
            return;
        }
        cart.items = [];
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
        yield cart.save();
        // Populate product for frontend response
        yield cart.populate("items.product");
        res.status(200).json(cart);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update cart quantity." });
    }
}));
exports.default = router;
