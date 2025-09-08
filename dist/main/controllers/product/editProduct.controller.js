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
exports.editProduct = void 0;
const Product_1 = __importDefault(require("../../../models/Product"));
const activity_service_1 = require("../../services/activity.service");
const server_1 = require("../../server");
const notification_service_1 = require("../../services/notification.service");
function detectChangedFieldsSummary(original, updates) {
    const changes = [];
    for (const key in updates) {
        let oldValue = original[key];
        let newValue = updates[key];
        // Convert arrays to comma-separated strings
        if (Array.isArray(oldValue)) {
            oldValue = oldValue.join(",");
        }
        if (Array.isArray(newValue)) {
            newValue = newValue.join(",");
        }
        // Convert objects to their 'name' if exists or stringify them
        if (typeof oldValue === "object" && oldValue !== null) {
            oldValue = oldValue.name || JSON.stringify(oldValue);
        }
        if (typeof newValue === "object" && newValue !== null) {
            newValue = newValue.name || JSON.stringify(newValue);
        }
        if (oldValue !== newValue) {
            changes.push(`${key}: "${oldValue}" → "${newValue}"`);
        }
    }
    if (changes.length === 0) {
        return "No changes detected.";
    }
    return "Changes: " + changes.join(", ");
}
const editProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        const updates = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const originalProduct = yield Product_1.default.findById(id).lean();
        if (!originalProduct) {
            res.status(404).json({ msg: "Product not found" });
            return;
        }
        const updatedProduct = yield Product_1.default.findByIdAndUpdate(id, updates, {
            new: true,
        });
        if (!updatedProduct) {
            res.status(404).json({ msg: "Product not found after update" });
            return;
        }
        const changeSummary = detectChangedFieldsSummary(originalProduct, updates);
        yield (0, notification_service_1.publishNotificationEvent)({
            userId: (_b = req === null || req === void 0 ? void 0 : req.user) === null || _b === void 0 ? void 0 : _b.id,
            title: "Edit Product",
            message: `Product ${updatedProduct === null || updatedProduct === void 0 ? void 0 : updatedProduct.name} edited. ${changeSummary}`,
            read: false,
        });
        // Fire-and-forget activity logging via RabbitMQ
        (0, activity_service_1.publishProductActivity)({
            user: userId,
            action: "update",
            products: [
                Object.assign({ _id: id }, updates),
            ],
        }).catch((err) => console.error("🐇 Failed to log update activity:", err));
        server_1.io.emit("product:edited", updatedProduct);
        res.status(200).json({
            msg: "Product updated successfully.",
            product: updatedProduct,
        });
    }
    catch (err) {
        res.status(500).json({ error: "Failed to update product." });
    }
});
exports.editProduct = editProduct;
