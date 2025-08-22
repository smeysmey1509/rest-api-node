"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DELIVERY_FEE = exports.SERVICE_TAX_RATE = void 0;
exports.calculateCartTotals = calculateCartTotals;
exports.SERVICE_TAX_RATE = 10;
exports.DELIVERY_FEE = 5;
function calculateCartTotals(subtotal, discount = 0) {
    // Avoid Math.max for a tiny speed boost
    const subtotalAfterDiscount = subtotal > discount ? subtotal - discount : 0;
    // Tax is % of subtotal AFTER discount
    const serviceTax = (subtotalAfterDiscount * exports.SERVICE_TAX_RATE) / 100;
    // Delivery fee stays fixed
    const deliveryFee = exports.DELIVERY_FEE;
    const total = subtotalAfterDiscount + serviceTax + deliveryFee;
    return { serviceTax, deliveryFee, total };
}
