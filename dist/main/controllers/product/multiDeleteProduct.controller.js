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
exports.multiDeleteProductController = void 0;
const Product_1 = __importDefault(require("../../../models/Product"));
const Category_1 = __importDefault(require("../../../models/Category"));
const activity_service_1 = require("../../services/activity.service");
const server_1 = require("../../server");
const notification_service_1 = require("../../services/notification.service");
const multiDeleteProductController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { ids } = req.body;
        const userId = (_a = req === null || req === void 0 ? void 0 : req.user) === null || _a === void 0 ? void 0 : _a.id;
        // Multiple delete
        if (Array.isArray(ids) && ids.length > 0) {
            const products = yield Product_1.default.find({ _id: { $in: ids } });
            const categories = yield Category_1.default.find({
                _id: { $in: products.map((p) => p.category) },
            });
            // Map only the required fields
            const productSnapshots = products.map(product => {
                const category = categories.find((c) => c._id.equals(product.category));
                return {
                    _id: product._id,
                    name: product.name,
                    description: product.description,
                    price: product.price,
                    stock: product.stock,
                    category: category ? {
                        _id: category._id,
                        name: category.name,
                        description: category.description,
                    } : null,
                    createdAt: product.createdAt,
                    updatedAt: product.updatedAt
                };
            });
            // 👇 Fire-and-forget: send to RabbitMQ
            (0, activity_service_1.publishProductActivity)({
                userId: userId,
                action: "delete",
                products: productSnapshots,
            }).catch((err) => {
                console.error("Failed to publish activity log:", err);
            });
            const result = yield Product_1.default.deleteMany({ _id: { $in: ids } });
            if (result.deletedCount === 0) {
                res.status(404).json({ msg: "Product not found no deleted." });
                return;
            }
            yield (0, notification_service_1.publishNotificationEvent)({
                user: (_b = req === null || req === void 0 ? void 0 : req.user) === null || _b === void 0 ? void 0 : _b.id,
                title: "Multi Delete Product",
                message: `Product ${products === null || products === void 0 ? void 0 : products.map(item => item === null || item === void 0 ? void 0 : item.name)} has been deleted.`,
                read: false,
            });
            // ✅ Emit real-time event for each deleted product
            ids.forEach(id => {
                server_1.io.emit("product:deleted", id);
            });
            res.status(200).json({ msg: `${result.deletedCount} products deleted successfully.` });
            return;
        }
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete product(s)." });
        return;
    }
});
exports.multiDeleteProductController = multiDeleteProductController;
