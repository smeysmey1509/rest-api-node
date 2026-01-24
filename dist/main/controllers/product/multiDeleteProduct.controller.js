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
const notification_service_1 = require("../../services/notification.service");
const server_1 = require("../../server");
const multiDeleteProductController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { ids } = req.body;
        const userId = (_a = req === null || req === void 0 ? void 0 : req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!Array.isArray(ids) || ids.length === 0) {
            res.status(400).json({ msg: "No valid product ids provided for deletion." });
            return;
        }
        const products = yield Product_1.default.find({ _id: { $in: ids } });
        if (products.length === 0) {
            res.status(404).json({ msg: "Product not found." });
            return;
        }
        const categories = yield Category_1.default.find({
            _id: { $in: products.map((p) => p.category) },
        });
        const productSnapshots = products.map((product) => {
            const category = categories.find((c) => c._id.equals(product.category));
            return {
                _id: product._id,
                name: product.name,
                description: product.description,
                price: product.price,
                stock: product.stock,
                category: category
                    ? {
                        _id: category._id,
                        name: category.categoryName,
                        description: category.description,
                    }
                    : null,
                createdAt: product.createdAt,
                updatedAt: product.updatedAt,
            };
        });
        const deleteResult = yield Product_1.default.deleteMany({ _id: { $in: ids } });
        if (deleteResult.deletedCount === 0) {
            res.status(404).json({ msg: "Product not found." });
            return;
        }
        const deletedIds = products.map((product) => String(product._id));
        const deletedNames = products.map((product) => product.name).join(", ");
        (0, activity_service_1.publishProductActivity)({
            userId,
            action: "delete",
            products: productSnapshots,
        }).catch((err) => {
            console.error("Failed to publish activity log:", err);
        });
        (0, notification_service_1.publishNotificationEvent)({
            userId,
            title: "Multi Delete Product",
            message: `Products deleted: ${deletedNames}`,
            read: false,
        }).catch((err) => {
            console.error("Failed to publish notification event:", err);
        });
        deletedIds.forEach((deletedId) => {
            server_1.io.emit("product:deleted", deletedId);
        });
        res.status(200).json({
            msg: `${deleteResult.deletedCount} products deleted successfully.`,
            ids: deletedIds,
        });
        return;
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete product(s)." });
        return;
    }
});
exports.multiDeleteProductController = multiDeleteProductController;
