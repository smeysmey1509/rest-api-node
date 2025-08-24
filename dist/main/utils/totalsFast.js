"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcTotalsSync = calcTotalsSync;
// utils/totalsFast.ts — purely sync math; no DB
function calcTotalsSync(opts) {
    var _a, _b;
    const taxRate = (_a = opts.taxRate) !== null && _a !== void 0 ? _a : 0;
    const freeThreshold = (_b = opts.freeThreshold) !== null && _b !== void 0 ? _b : null;
    const discounted = Math.max(0, opts.subTotal - (opts.discount || 0));
    const deliveryFee = freeThreshold != null && discounted >= freeThreshold ? 0 : (opts.baseFee || 0);
    const serviceTax = Math.round(discounted * taxRate);
    const total = discounted + deliveryFee + serviceTax;
    return { deliveryFee, serviceTax, total };
}
