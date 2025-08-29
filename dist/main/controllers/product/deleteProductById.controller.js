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
exports.deleteProductById = void 0;
// src/main/controllers/product/deleteProductById.controller.ts
const mongoose_1 = __importDefault(require("mongoose"));
const Product_1 = __importDefault(require("../../../models/Product"));
const activity_service_1 = require("../../services/activity.service");
const server_1 = require("../../server");
const notification_service_1 = require("../../services/notification.service");
const deleteProductById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
        const { id } = req.params;
        if (!id || !mongoose_1.default.isValidObjectId(id)) {
            res.status(400).json({ msg: "Invalid id provided for deletion." });
            return;
        }
        // Fetch only what we need; lean so TS sees a POJO we control.
        const product = yield Product_1.default.findById(id)
            .select("name description price stock category createdAt updatedAt variants.price variants.inventory variants.isActive")
            .populate("category", "name description")
            .lean()
            .exec();
        if (!product) {
            res.status(404).json({ msg: "Product not found." });
            return;
        }
        // Normalize category (either ObjectId or populated object)
        const cat = product.category && typeof product.category === "object"
            ? product.category
            : null;
        // Compute price/stock in a schema-agnostic way
        const computedPrice = (_e = (_a = product.price) !== null && _a !== void 0 ? _a : (_d = (_c = (_b = product.variants) === null || _b === void 0 ? void 0 : _b.find(v => { var _a; return ((_a = v === null || v === void 0 ? void 0 : v.price) === null || _a === void 0 ? void 0 : _a.amount) != null; })) === null || _c === void 0 ? void 0 : _c.price) === null || _d === void 0 ? void 0 : _d.amount) !== null && _e !== void 0 ? _e : 0;
        const computedStock = (_f = product.stock) !== null && _f !== void 0 ? _f : (product.variants || []).reduce((acc, v) => {
            var _a, _b, _c, _d, _e, _f;
            if (!(v === null || v === void 0 ? void 0 : v.isActive))
                return acc;
            const onHand = (_b = (_a = v.inventory) === null || _a === void 0 ? void 0 : _a.onHand) !== null && _b !== void 0 ? _b : 0;
            const reserved = (_d = (_c = v.inventory) === null || _c === void 0 ? void 0 : _c.reserved) !== null && _d !== void 0 ? _d : 0;
            const safety = (_f = (_e = v.inventory) === null || _e === void 0 ? void 0 : _e.safetyStock) !== null && _f !== void 0 ? _f : 0;
            const available = Math.max(0, onHand - reserved - safety);
            return acc + available;
        }, 0);
        const productSnapshot = {
            _id: product._id,
            name: product.name,
            description: product.description,
            price: computedPrice,
            stock: computedStock,
            category: cat
                ? { _id: cat._id, name: cat.name, description: cat.description }
                : null,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
        };
        yield (0, notification_service_1.publishNotificationEvent)({
            userId: (_g = req === null || req === void 0 ? void 0 : req.user) === null || _g === void 0 ? void 0 : _g.id,
            title: "Delete Product",
            message: `Product ${product === null || product === void 0 ? void 0 : product.name} has been deleted.`,
            read: false,
        });
        yield (0, activity_service_1.publishProductActivity)({
            user: (_h = req.user) === null || _h === void 0 ? void 0 : _h.id,
            action: "delete",
            products: [productSnapshot],
        });
        yield Product_1.default.findByIdAndDelete(id);
        server_1.io.emit("product:deleted", String(product._id));
        res.status(200).json({ msg: "Product deleted successfully.", id: product._id });
    }
    catch (err) {
        console.error("❌ Error deleting product:", err);
        res.status(500).json({ error: "Failed to delete product." });
    }
});
exports.deleteProductById = deleteProductById;
