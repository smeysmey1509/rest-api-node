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
const auth_1 = require("../../middleware/auth");
const Wishlist_1 = __importDefault(require("../../models/Wishlist"));
const Product_1 = __importDefault(require("../../models/Product"));
const Cart_1 = __importDefault(require("../../models/Cart"));
const DeliverySetting_1 = __importDefault(require("../../models/DeliverySetting"));
const cartTotals_1 = require("../utils/cartTotals");
const cache_1 = require("../utils/cache");
const router = (0, express_1.Router)();
const buildCartSnapshot = (cartDoc) => __awaiter(void 0, void 0, void 0, function* () {
    yield cartDoc.populate("items.product");
    const deliveryDoc = cartDoc.delivery ||
        (yield DeliverySetting_1.default.findOne({ isActive: true }).lean()) ||
        { _id: null, method: "standard", fee: 0, taxRate: 0 };
    const subTotal = cartDoc.items.reduce((acc, item) => {
        var _a;
        const price = ((_a = item.product) === null || _a === void 0 ? void 0 : _a.price) || 0;
        return acc + price * item.quantity;
    }, 0);
    const method = String(deliveryDoc.method || "standard").toLowerCase();
    const { serviceTax, deliveryFee, total } = yield (0, cartTotals_1.calculateCartTotals)(subTotal, cartDoc.discount || 0, method);
    cartDoc.subTotal = subTotal;
    cartDoc.serviceTax = serviceTax;
    cartDoc.deliveryFee = deliveryFee;
    cartDoc.total = total;
    yield cartDoc.save();
    const snapshot = {
        _id: cartDoc._id,
        user: cartDoc.user,
        items: cartDoc.items,
        promoCode: cartDoc.promoCode,
        delivery: typeof deliveryDoc.toObject === "function"
            ? deliveryDoc.toObject()
            : deliveryDoc,
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
    yield (0, cache_1.setCachedCart)(String(cartDoc.user), snapshot);
    return snapshot;
});
router.get("/wishlist", auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const wishlist = yield Wishlist_1.default.findOne({ user: req.user.id })
            .populate({
            path: "items.product",
            select: "name price images thumbnail slug discount",
        })
            .lean();
        if (!wishlist) {
            res.status(200).json({ items: [] });
            return;
        }
        res.status(200).json(wishlist);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch wishlist." });
    }
}));
router.post("/wishlist/add", auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId, note } = req.body;
        if (!productId) {
            res.status(400).json({ error: "Product ID is required." });
            return;
        }
        const product = yield Product_1.default.findById(productId);
        if (!product) {
            res.status(404).json({ error: "Product not found." });
            return;
        }
        let wishlist = yield Wishlist_1.default.findOne({ user: req.user.id });
        if (!wishlist) {
            wishlist = new Wishlist_1.default({ user: req.user.id, items: [] });
        }
        const alreadySaved = wishlist.items.some((item) => String(item.product) === String(productId));
        if (alreadySaved) {
            yield wishlist.populate({
                path: "items.product",
                select: "name price images thumbnail slug discount",
            });
            res.status(200).json({
                message: "Product already in wishlist.",
                wishlist: wishlist.toObject(),
            });
            return;
        }
        wishlist.items.push({ product: productId, note });
        yield wishlist.save();
        yield wishlist.populate({
            path: "items.product",
            select: "name price images thumbnail slug discount",
        });
        res.status(201).json({
            message: "Product saved for later.",
            wishlist: wishlist.toObject(),
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to add to wishlist." });
    }
}));
router.delete("/wishlist/:productId", auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId } = req.params;
        const wishlist = yield Wishlist_1.default.findOne({ user: req.user.id });
        if (!wishlist) {
            res.status(404).json({ error: "Wishlist not found." });
            return;
        }
        const hadProduct = wishlist.items.some((item) => String(item.product) === String(productId));
        if (!hadProduct) {
            res.status(404).json({ error: "Product not found in wishlist." });
            return;
        }
        wishlist.items = wishlist.items.filter((item) => String(item.product) !== String(productId));
        yield wishlist.save();
        yield wishlist.populate({
            path: "items.product",
            select: "name price images thumbnail slug discount",
        });
        res.status(200).json({
            message: "Product removed from wishlist.",
            wishlist: wishlist.toObject(),
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to remove product." });
    }
}));
router.post("/wishlist/move-to-cart", auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId, quantity } = req.body;
        if (!productId) {
            res.status(400).json({ error: "Product ID is required." });
            return;
        }
        const product = yield Product_1.default.findById(productId);
        if (!product) {
            res.status(404).json({ error: "Product not found." });
            return;
        }
        const wishlist = yield Wishlist_1.default.findOne({ user: req.user.id });
        if (!wishlist) {
            res.status(404).json({ error: "Wishlist not found." });
            return;
        }
        const hadProduct = wishlist.items.some((item) => String(item.product) === String(productId));
        if (!hadProduct) {
            res.status(404).json({ error: "Product not found in wishlist." });
            return;
        }
        wishlist.items = wishlist.items.filter((item) => String(item.product) !== String(productId));
        yield wishlist.save();
        yield wishlist.populate({
            path: "items.product",
            select: "name price images thumbnail slug discount",
        });
        let cart = yield Cart_1.default.findOne({ user: req.user.id }).populate("delivery");
        if (!cart) {
            cart = new Cart_1.default({ user: req.user.id, items: [] });
        }
        const existingItem = cart.items.find((item) => String(item.product) === String(productId));
        const desiredQuantity = quantity ? Number(quantity) : 1;
        const safeQuantity = Number.isFinite(desiredQuantity)
            ? Math.max(1, desiredQuantity)
            : 1;
        if (existingItem) {
            existingItem.quantity += safeQuantity;
        }
        else {
            cart.items.push({
                product: productId,
                quantity: safeQuantity,
            });
        }
        const cartSnapshot = yield buildCartSnapshot(cart);
        res.status(200).json({
            message: "Moved product to cart.",
            wishlist: wishlist.toObject(),
            cart: cartSnapshot,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to move product to cart." });
    }
}));
exports.default = router;
