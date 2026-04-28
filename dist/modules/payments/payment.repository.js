"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentRepository = void 0;
const payment_model_1 = __importDefault(require("./payment.model"));
exports.paymentRepository = {
    create(payload) {
        return payment_model_1.default.create(payload);
    },
    findById(id) {
        return payment_model_1.default.findById(id);
    },
    findByTransaction(transactionId) {
        return payment_model_1.default.findOne({
            $or: [{ transactionId }, { merchantRef: transactionId }, { gatewayReference: transactionId }],
        });
    },
    findByOrder(orderId) {
        return payment_model_1.default.findOne({ order: orderId }).sort({ createdAt: -1 });
    },
    update(id, updates) {
        return payment_model_1.default.findByIdAndUpdate(id, updates, { new: true });
    },
};
