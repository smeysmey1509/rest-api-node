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
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderService = void 0;
const appError_1 = require("../../common/utils/appError");
const orderStatus_1 = require("../../common/constants/orderStatus");
const paymentStatus_1 = require("../../common/constants/paymentStatus");
const payment_service_1 = require("../payments/payment.service");
const order_repository_1 = require("./order.repository");
const cancellableStatuses = [orderStatus_1.OrderStatus.PENDING_PAYMENT, "pending"];
exports.orderService = {
    listMine(userId) {
        return order_repository_1.orderRepository.listByUser(userId);
    },
    listAll() {
        return order_repository_1.orderRepository.listAll();
    },
    cancel(userId, orderId) {
        return __awaiter(this, void 0, void 0, function* () {
            const order = yield order_repository_1.orderRepository.findById(orderId);
            if (!order)
                throw new appError_1.AppError("Order not found", 404);
            if (String(order.user) !== String(userId))
                throw new appError_1.AppError("Forbidden", 403);
            if (!cancellableStatuses.includes(order.status)) {
                throw new appError_1.AppError("Order cannot be cancelled at this stage.", 400);
            }
            order.status = orderStatus_1.OrderStatus.CANCELLED;
            order.statusHistory = [
                ...(order.statusHistory || []),
                { status: orderStatus_1.OrderStatus.CANCELLED, message: "Order cancelled by customer.", updatedAt: new Date() },
            ];
            order.payment = Object.assign(Object.assign({}, (order.payment || {})), { status: paymentStatus_1.PaymentStatus.CANCELLED });
            yield order.save();
            yield payment_service_1.paymentService.markFailedByOrder(orderId, paymentStatus_1.PaymentStatus.CANCELLED);
            return order;
        });
    },
    updateStatus(orderId, status) {
        return __awaiter(this, void 0, void 0, function* () {
            const normalized = (0, orderStatus_1.normalizeOrderStatus)(status);
            if (normalized === orderStatus_1.OrderStatus.PAID) {
                throw new appError_1.AppError("Use payment confirmation to mark an order as paid.", 400);
            }
            const order = yield order_repository_1.orderRepository.findById(orderId);
            if (!order)
                throw new appError_1.AppError("Order not found", 404);
            order.status = normalized;
            order.statusHistory = [
                ...(order.statusHistory || []),
                { status: normalized, message: "Order status updated by admin.", updatedAt: new Date() },
            ];
            yield order.save();
            return order;
        });
    },
};
