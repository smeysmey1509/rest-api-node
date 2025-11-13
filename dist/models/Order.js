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
const OrderItemSchema = new mongoose_1.Schema({
    product: { type: mongoose_1.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    slug: { type: String },
    image: { type: String },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
}, { _id: false });
const ShippingAddressSchema = new mongoose_1.Schema({
    fullName: { type: String },
    phone: { type: String },
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String },
    state: { type: String },
    postalCode: { type: String },
    country: { type: String, required: true },
}, { _id: false });
const PaymentSchema = new mongoose_1.Schema({
    method: { type: String },
    status: {
        type: String,
        enum: ["pending", "authorized", "paid", "failed", "refunded"],
        default: "pending",
    },
    transactionId: { type: String },
}, { _id: false });
const DeliverySummarySchema = new mongoose_1.Schema({
    setting: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "DeliverySetting",
        default: null,
    },
    method: { type: String, required: true },
    baseFee: { type: Number },
    estimatedDays: { type: Number },
    code: { type: String },
}, { _id: false });
const ContactSchema = new mongoose_1.Schema({
    fullName: { type: String },
    email: { type: String },
    phone: { type: String },
}, { _id: false });
const PromoSummarySchema = new mongoose_1.Schema({
    code: { type: String, required: true },
    type: { type: String },
    value: { type: Number },
    amount: { type: Number },
    maxUsesPerUser: { type: Number },
    expiresAt: { type: Date },
}, { _id: false });
const OrderSummarySchema = new mongoose_1.Schema({
    subTotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0 },
    serviceTax: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    promoCode: { type: String, default: null },
    promo: { type: PromoSummarySchema, default: null },
}, { _id: false });
const OrderSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    items: { type: [OrderItemSchema], required: true },
    subTotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    deliveryFee: { type: Number, default: 0, min: 0 },
    serviceTax: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
        type: String,
        enum: [
            "pending",
            "processing",
            "paid",
            "shipped",
            "delivered",
            "cancelled",
        ],
        default: "pending",
    },
    payment: { type: PaymentSchema, default: () => ({ status: "pending" }) },
    shippingAddress: { type: ShippingAddressSchema, required: false },
    delivery: { type: DeliverySummarySchema, required: false },
    promoCode: { type: mongoose_1.Schema.Types.ObjectId, ref: "PromoCode", default: null },
    notes: { type: String },
    contact: { type: ContactSchema, required: false },
    summary: { type: OrderSummarySchema, required: true },
}, { timestamps: true });
exports.default = mongoose_1.default.model("Order", OrderSchema);
