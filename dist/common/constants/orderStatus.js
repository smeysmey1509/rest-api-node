"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeOrderStatus = exports.OrderStatus = void 0;
exports.OrderStatus = {
    PENDING_PAYMENT: "PENDING_PAYMENT",
    PAID: "PAID",
    PROCESSING: "PROCESSING",
    SHIPPED: "SHIPPED",
    DELIVERED: "DELIVERED",
    CANCELLED: "CANCELLED",
    REFUNDED: "REFUNDED",
    FAILED: "FAILED",
};
const legacyOrderStatusMap = {
    pending: exports.OrderStatus.PENDING_PAYMENT,
    paid: exports.OrderStatus.PAID,
    processing: exports.OrderStatus.PROCESSING,
    shipped: exports.OrderStatus.SHIPPED,
    delivered: exports.OrderStatus.DELIVERED,
    cancelled: exports.OrderStatus.CANCELLED,
    refunded: exports.OrderStatus.REFUNDED,
    failed: exports.OrderStatus.FAILED,
};
const normalizeOrderStatus = (status) => {
    if (!status)
        return exports.OrderStatus.PENDING_PAYMENT;
    const upper = status.toUpperCase();
    if (Object.values(exports.OrderStatus).includes(upper)) {
        return upper;
    }
    return legacyOrderStatusMap[status.toLowerCase()] || exports.OrderStatus.PENDING_PAYMENT;
};
exports.normalizeOrderStatus = normalizeOrderStatus;
