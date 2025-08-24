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
const Product_1 = __importDefault(require("../../../models/Product"));
const activity_service_1 = require("../../services/activity.service");
const server_1 = require("../../server");
const notification_service_1 = require("../../services/notification.service");
const deleteProductById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        if (!id) {
            res.status(400).json({ msg: "Noo valid id provided for deletion." });
            return;
        }
        // Fetch product before deletion
        const product = yield Product_1.default.findById(id).populate("category", "name description");
        if (!product) {
            res.status(404).json({ msg: "Product not found." });
            return;
        }
        // Prepare snapshot for activity log
        const productSnapshot = {
            _id: product._id,
            name: product.name,
            description: product.description,
            price: product.price,
            stock: product.stock,
            category: product.category
                ? {
                    _id: product.category._id,
                    name: product.category.name,
                    description: product.category.description,
                }
                : null,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt
        };
        // Publish notification for other users
        yield (0, notification_service_1.publishNotificationEvent)({
            userId: (_a = req === null || req === void 0 ? void 0 : req.user) === null || _a === void 0 ? void 0 : _a.id,
            title: "Delete Product",
            message: `Product ${product === null || product === void 0 ? void 0 : product.name} has been deleted.`,
            read: false,
        });
        // Log activity via RabbitMQ
        (0, activity_service_1.publishProductActivity)({
            user: (_b = req.user) === null || _b === void 0 ? void 0 : _b.id,
            action: "delete",
            products: [productSnapshot],
        });
        // Delete the product
        yield Product_1.default.findByIdAndDelete(id);
        // 👇 Emit real-time delete event
        server_1.io.emit("product:deleted", product._id);
        res.status(200).json({ msg: "Product deleted successfully.", id: product._id });
        return;
    }
    catch (err) {
        console.error("❌ Error deleting product:", err);
        res.status(500).json({ error: "Failed to delete product." });
        return;
    }
});
exports.deleteProductById = deleteProductById;
