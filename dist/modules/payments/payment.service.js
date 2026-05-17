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
exports.paymentService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const order_model_1 = __importDefault(require("../orders/order.model"));
const product_model_1 = __importDefault(require("../products/product.model"));
const product_variant_model_1 = __importDefault(require("../product-variants/product-variant.model"));
const inventory_unit_service_1 = require("../inventory-units/inventory-unit.service");
const payment_model_1 = __importStar(require("./payment.model"));
const payment_repository_1 = require("./payment.repository");
const paymentStatus_1 = require("../../shared/constants/paymentStatus");
const orderStatus_1 = require("../../shared/constants/orderStatus");
const app_error_1 = require("../../shared/errors/app-error");
const normal_gateway_1 = require("./gateways/normal.gateway");
const card_gateway_1 = require("./gateways/card.gateway");
const bankTransfer_gateway_1 = require("./gateways/bankTransfer.gateway");
const cashOnDelivery_gateway_1 = require("./gateways/cashOnDelivery.gateway");
const normalizePaymentMethod = (method) => {
    const normalized = String(method || payment_model_1.PaymentMethod.NORMAL_PAYMENT).toUpperCase();
    if (Object.values(payment_model_1.PaymentMethod).includes(normalized)) {
        return normalized;
    }
    throw new app_error_1.AppError("Unsupported payment method", 400);
};
const createTransactionId = () => {
    const timestamp = Date.now().toString().slice(-10);
    const suffix = Math.random().toString().slice(2, 8);
    return `${timestamp}${suffix}`;
};
const getGateway = (method) => {
    switch (method) {
        case payment_model_1.PaymentMethod.NORMAL_PAYMENT:
            return normal_gateway_1.normalGateway;
        case payment_model_1.PaymentMethod.VISA_MASTER:
            return card_gateway_1.cardGateway;
        case payment_model_1.PaymentMethod.BANK_TRANSFER:
            return bankTransfer_gateway_1.bankTransferGateway;
        case payment_model_1.PaymentMethod.CASH_ON_DELIVERY:
            return cashOnDelivery_gateway_1.cashOnDeliveryGateway;
        default:
            return cashOnDelivery_gateway_1.cashOnDeliveryGateway;
    }
};
const getProvider = (method) => {
    if (method === payment_model_1.PaymentMethod.NORMAL_PAYMENT)
        return "NORMAL_PAYMENT";
    if (method === payment_model_1.PaymentMethod.VISA_MASTER)
        return "CARD_HOSTED";
    return method;
};
exports.paymentService = {
    normalizePaymentMethod,
    createForOrder(order, methodInput) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const method = normalizePaymentMethod(methodInput);
            const payment = yield payment_repository_1.paymentRepository.create({
                order: order._id,
                user: order.user,
                method,
                provider: getProvider(method),
                status: paymentStatus_1.PaymentStatus.PENDING,
                amount: order.total,
                currency: ((_a = order.payment) === null || _a === void 0 ? void 0 : _a.currency) || "USD",
                transactionId: createTransactionId(),
                merchantRef: String(order._id),
                metadata: {
                    orderStatus: order.status,
                },
            });
            const gateway = getGateway(method);
            const gatewayResult = yield gateway.initiate({ payment, order, method });
            payment.provider = gatewayResult.provider;
            payment.gatewayReference = gatewayResult.gatewayReference;
            payment.gatewayStatus = gatewayResult.status;
            payment.checkoutData = gatewayResult.checkoutData || {};
            yield payment.save();
            order.payment = Object.assign(Object.assign({}, (order.payment || {})), { method, status: paymentStatus_1.PaymentStatus.PENDING, transactionId: payment.transactionId, currency: payment.currency, paidAt: null });
            yield order.save();
            return payment;
        });
    },
    getById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const payment = yield payment_repository_1.paymentRepository.findById(id);
            if (!payment)
                throw new app_error_1.AppError("Payment not found", 404);
            return payment;
        });
    },
    verifyPayment(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const payment = yield payment_repository_1.paymentRepository.findById(id);
            if (!payment)
                throw new app_error_1.AppError("Payment not found", 404);
            const result = yield getGateway(payment.method).verify(payment.transactionId);
            if (result.success) {
                return this.markSuccess(payment, result.raw, result.paidAt || new Date());
            }
            payment.gatewayStatus = result.status;
            payment.metadata = Object.assign(Object.assign({}, (payment.metadata || {})), { lastVerification: result.raw });
            yield payment.save();
            return payment;
        });
    },
    markManualSuccess(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const payment = yield payment_repository_1.paymentRepository.findById(id);
            if (!payment)
                throw new app_error_1.AppError("Payment not found", 404);
            return this.markSuccess(payment, { manual: true }, new Date());
        });
    },
    markSuccess(payment, raw, paidAt) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (payment.status === paymentStatus_1.PaymentStatus.SUCCESS)
                return payment;
            const session = yield mongoose_1.default.startSession();
            session.startTransaction();
            try {
                const freshPayment = yield payment_model_1.default.findById(payment._id).session(session);
                if (!freshPayment)
                    throw new app_error_1.AppError("Payment not found", 404);
                if (freshPayment.status === paymentStatus_1.PaymentStatus.SUCCESS) {
                    yield session.commitTransaction();
                    return freshPayment;
                }
                const order = yield order_model_1.default.findById(freshPayment.order).session(session);
                if (!order)
                    throw new app_error_1.AppError("Order not found", 404);
                for (const item of order.items) {
                    const inventoryUnitIds = Array.isArray(item.inventoryUnitIds) ? item.inventoryUnitIds : [];
                    if (inventoryUnitIds.length) {
                        if (Number(item.quantity) !== inventoryUnitIds.length) {
                            throw new app_error_1.AppError(`Quantity must match selected serial units for ${item.name}.`, 400);
                        }
                        yield inventory_unit_service_1.inventoryUnitService.sell({
                            inventoryUnitIds,
                            orderId: order._id,
                            soldPrice: (_a = item.unitPrice) !== null && _a !== void 0 ? _a : item.price,
                        }, String(order.user), session);
                        yield product_model_1.default.updateOne({ _id: item.product }, { $inc: { salesCount: item.quantity } }, { session });
                        continue;
                    }
                    if (item.variantId) {
                        const variantResult = yield product_variant_model_1.default.updateOne({
                            _id: item.variantId,
                            "stockSummary.available": { $gte: item.quantity },
                            "stockSummary.onHand": { $gte: item.quantity },
                        }, {
                            $inc: {
                                "stockSummary.available": -item.quantity,
                                "stockSummary.onHand": -item.quantity,
                                "stockSummary.sold": item.quantity,
                            },
                        }, { session });
                        if (variantResult.modifiedCount !== 1) {
                            throw new app_error_1.AppError(`Not enough stock for ${item.name}.`, 400);
                        }
                        yield product_model_1.default.updateOne({ _id: item.product }, { $inc: { salesCount: item.quantity } }, { session });
                        continue;
                    }
                    const result = yield product_model_1.default.updateOne({ _id: item.product, stock: { $gte: item.quantity } }, { $inc: { stock: -item.quantity, salesCount: item.quantity } }, { session });
                    if (result.modifiedCount !== 1) {
                        throw new app_error_1.AppError(`Not enough stock for ${item.name}.`, 400);
                    }
                }
                freshPayment.status = paymentStatus_1.PaymentStatus.SUCCESS;
                freshPayment.verifiedAt = new Date();
                freshPayment.paidAt = paidAt;
                freshPayment.gatewayStatus = "APPROVED";
                freshPayment.metadata = Object.assign(Object.assign({}, (freshPayment.metadata || {})), { confirmation: raw });
                yield freshPayment.save({ session });
                order.status = orderStatus_1.OrderStatus.PAID;
                order.payment = Object.assign(Object.assign({}, (order.payment || {})), { method: freshPayment.method, status: paymentStatus_1.PaymentStatus.SUCCESS, transactionId: freshPayment.transactionId, currency: freshPayment.currency, paidAt });
                order.statusHistory = [
                    ...(order.statusHistory || []),
                    {
                        status: orderStatus_1.OrderStatus.PAID,
                        message: "Payment confirmed by backend.",
                        updatedAt: new Date(),
                    },
                ];
                yield order.save({ session });
                yield session.commitTransaction();
                return freshPayment;
            }
            catch (err) {
                yield session.abortTransaction();
                throw err;
            }
            finally {
                session.endSession();
            }
        });
    },
    markFailedByOrder(orderId_1) {
        return __awaiter(this, arguments, void 0, function* (orderId, status = paymentStatus_1.PaymentStatus.FAILED) {
            const payment = yield payment_repository_1.paymentRepository.findByOrder(orderId);
            if (!payment)
                return null;
            payment.status = status;
            yield payment.save();
            return payment;
        });
    },
};
