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
exports.PaymentMethod = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const paymentStatus_1 = require("../../common/constants/paymentStatus");
exports.PaymentMethod = {
    NORMAL_PAYMENT: "NORMAL_PAYMENT",
    VISA_MASTER: "VISA_MASTER",
    BANK_TRANSFER: "BANK_TRANSFER",
    CASH_ON_DELIVERY: "CASH_ON_DELIVERY",
};
const PaymentSchema = new mongoose_1.Schema({
    order: { type: mongoose_1.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    method: {
        type: String,
        enum: Object.values(exports.PaymentMethod),
        required: true,
        index: true,
    },
    provider: { type: String, required: true, trim: true },
    status: {
        type: String,
        enum: Object.values(paymentStatus_1.PaymentStatus),
        default: paymentStatus_1.PaymentStatus.PENDING,
        index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD", uppercase: true, trim: true },
    transactionId: { type: String, required: true, unique: true, index: true },
    merchantRef: { type: String, index: true },
    gatewayReference: { type: String },
    gatewayStatus: { type: String },
    checkoutData: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    metadata: { type: mongoose_1.Schema.Types.Mixed, default: {} },
    verifiedAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
}, { timestamps: true });
PaymentSchema.index({ order: 1, method: 1 });
const Payment = mongoose_1.default.models.Payment || mongoose_1.default.model("Payment", PaymentSchema);
exports.default = Payment;
