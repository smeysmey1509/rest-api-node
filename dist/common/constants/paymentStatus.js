"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePaymentStatus = exports.PaymentStatus = void 0;
exports.PaymentStatus = {
    PENDING: "PENDING",
    SUCCESS: "SUCCESS",
    FAILED: "FAILED",
    CANCELLED: "CANCELLED",
    REFUNDED: "REFUNDED",
};
const legacyPaymentStatusMap = {
    pending: exports.PaymentStatus.PENDING,
    authorized: exports.PaymentStatus.PENDING,
    paid: exports.PaymentStatus.SUCCESS,
    success: exports.PaymentStatus.SUCCESS,
    approved: exports.PaymentStatus.SUCCESS,
    failed: exports.PaymentStatus.FAILED,
    cancelled: exports.PaymentStatus.CANCELLED,
    canceled: exports.PaymentStatus.CANCELLED,
    refunded: exports.PaymentStatus.REFUNDED,
};
const normalizePaymentStatus = (status) => {
    if (status === 0)
        return exports.PaymentStatus.SUCCESS;
    if (status === undefined || status === null)
        return exports.PaymentStatus.PENDING;
    const value = String(status).trim();
    const upper = value.toUpperCase();
    if (Object.values(exports.PaymentStatus).includes(upper)) {
        return upper;
    }
    return legacyPaymentStatusMap[value.toLowerCase()] || exports.PaymentStatus.PENDING;
};
exports.normalizePaymentStatus = normalizePaymentStatus;
