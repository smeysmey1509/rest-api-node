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
const PurchaseSchema = new mongoose_1.Schema({
    supplierId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Supplier" },
    purchaseOrderId: { type: mongoose_1.Schema.Types.Mixed },
    costPrice: { type: Number, min: 0 },
    currency: { type: String, uppercase: true, default: "USD" },
    receivedAt: { type: Date },
}, { _id: false });
const WarrantySchema = new mongoose_1.Schema({
    warrantyMonths: { type: Number, min: 0 },
    warrantyStartAt: { type: Date },
    warrantyEndAt: { type: Date },
}, { _id: false });
const SoldSchema = new mongoose_1.Schema({
    orderId: { type: mongoose_1.Schema.Types.Mixed },
    orderItemId: { type: mongoose_1.Schema.Types.Mixed },
    soldAt: { type: Date },
    soldPrice: { type: Number, min: 0 },
}, { _id: false });
const InventoryUnitSchema = new mongoose_1.Schema({
    productId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: mongoose_1.Schema.Types.ObjectId, ref: "ProductVariant", required: true },
    locationId: { type: mongoose_1.Schema.Types.ObjectId, ref: "StockLocation", required: true },
    serialNumber: { type: String, trim: true },
    imei1: { type: String, trim: true },
    imei2: { type: String, trim: true },
    status: {
        type: String,
        enum: ["AVAILABLE", "RESERVED", "SOLD", "RETURNED", "DAMAGED", "REPAIR", "LOST", "TRANSFERRED"],
        default: "AVAILABLE",
    },
    condition: {
        type: String,
        enum: ["NEW", "USED", "REFURBISHED", "OPEN_BOX"],
        default: "NEW",
    },
    purchase: { type: PurchaseSchema, default: undefined },
    warranty: { type: WarrantySchema, default: undefined },
    reservedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    reservedUntil: { type: Date },
    sold: { type: SoldSchema, default: undefined },
}, { timestamps: true, versionKey: false });
InventoryUnitSchema.pre("validate", function (next) {
    var _a;
    if (this.serialNumber)
        this.serialNumber = String(this.serialNumber).trim();
    if (this.imei1)
        this.imei1 = String(this.imei1).trim();
    if (this.imei2)
        this.imei2 = String(this.imei2).trim();
    if ((_a = this.purchase) === null || _a === void 0 ? void 0 : _a.currency)
        this.purchase.currency = String(this.purchase.currency).toUpperCase();
    next();
});
InventoryUnitSchema.index({ serialNumber: 1 }, { unique: true, sparse: true });
InventoryUnitSchema.index({ imei1: 1 }, { unique: true, sparse: true });
InventoryUnitSchema.index({ imei2: 1 }, { unique: true, sparse: true });
InventoryUnitSchema.index({ productId: 1 });
InventoryUnitSchema.index({ variantId: 1 });
InventoryUnitSchema.index({ locationId: 1 });
InventoryUnitSchema.index({ status: 1 });
InventoryUnitSchema.index({ variantId: 1, status: 1 });
InventoryUnitSchema.index({ locationId: 1, status: 1 });
InventoryUnitSchema.index({ reservedUntil: 1, status: 1 });
const InventoryUnit = mongoose_1.default.models.InventoryUnit || mongoose_1.default.model("InventoryUnit", InventoryUnitSchema);
exports.default = InventoryUnit;
