"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const InventoryMovementSchema = new mongoose_1.Schema({
    productId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    variantId: { type: mongoose_1.Schema.Types.ObjectId, ref: "ProductVariant", required: true, index: true },
    inventoryUnitId: { type: mongoose_1.Schema.Types.ObjectId, ref: "InventoryUnit", index: true },
    type: {
        type: String,
        enum: [
            "STOCK_IN",
            "STOCK_OUT",
            "RESERVED",
            "RESERVATION_RELEASED",
            "SOLD",
            "RETURNED",
            "TRANSFERRED",
            "ADJUSTED",
            "DAMAGED",
            "REPAIR",
        ],
        required: true,
        index: true,
    },
    fromLocationId: { type: mongoose_1.Schema.Types.ObjectId, ref: "StockLocation", index: true },
    toLocationId: { type: mongoose_1.Schema.Types.ObjectId, ref: "StockLocation", index: true },
    quantity: { type: Number, required: true, min: 1 },
    serialNumber: { type: String, trim: true },
    imei1: { type: String, trim: true },
    referenceType: {
        type: String,
        enum: ["PURCHASE_ORDER", "ORDER", "RETURN", "TRANSFER", "MANUAL_ADJUSTMENT", "SYSTEM"],
        default: "SYSTEM",
        index: true,
    },
    referenceId: { type: mongoose_1.Schema.Types.Mixed },
    note: { type: String, trim: true, default: "" },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", index: true },
}, { timestamps: { createdAt: true, updatedAt: false }, versionKey: false });
InventoryMovementSchema.index({ inventoryUnitId: 1, createdAt: -1 });
InventoryMovementSchema.index({ variantId: 1, createdAt: -1 });
InventoryMovementSchema.index({ productId: 1, createdAt: -1 });
InventoryMovementSchema.index({ referenceType: 1, referenceId: 1 });
const InventoryMovement = mongoose_1.default.models.InventoryMovement ||
    mongoose_1.default.model("InventoryMovement", InventoryMovementSchema);
exports.default = InventoryMovement;
