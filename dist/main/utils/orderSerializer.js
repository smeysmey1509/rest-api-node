"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
function serializeOrder(orderDoc) {
    var _a, _b, _c, _d, _e;
    const plainOrder = orderDoc.toObject ? orderDoc.toObject({ virtuals: false }) : orderDoc;
    delete plainOrder.__v;
    const _f = plainOrder, { statusHistory: storedStatusHistory, payment: orderPayment, delivery: orderDelivery, summary: orderSummaryDoc } = _f, orderRest = __rest(_f, ["statusHistory", "payment", "delivery", "summary"]);
    return Object.assign(Object.assign({}, orderRest), { payment: Object.assign(Object.assign({}, (orderPayment || {})), { method: (_a = orderPayment === null || orderPayment === void 0 ? void 0 : orderPayment.method) !== null && _a !== void 0 ? _a : null, status: (orderPayment === null || orderPayment === void 0 ? void 0 : orderPayment.status) || "pending", transactionId: (_b = orderPayment === null || orderPayment === void 0 ? void 0 : orderPayment.transactionId) !== null && _b !== void 0 ? _b : null, currency: (orderPayment === null || orderPayment === void 0 ? void 0 : orderPayment.currency) || "USD", paidAt: (orderPayment === null || orderPayment === void 0 ? void 0 : orderPayment.paidAt) || null }), delivery: orderDelivery
            ? Object.assign(Object.assign({}, orderDelivery), { carrier: (_c = orderDelivery === null || orderDelivery === void 0 ? void 0 : orderDelivery.carrier) !== null && _c !== void 0 ? _c : null, trackingNumber: (_d = orderDelivery === null || orderDelivery === void 0 ? void 0 : orderDelivery.trackingNumber) !== null && _d !== void 0 ? _d : null, trackingUrl: (_e = orderDelivery === null || orderDelivery === void 0 ? void 0 : orderDelivery.trackingUrl) !== null && _e !== void 0 ? _e : null, estimatedDeliveryDate: (orderDelivery === null || orderDelivery === void 0 ? void 0 : orderDelivery.estimatedDeliveryDate) || null }) : undefined, status: {
            current: plainOrder.status,
            history: storedStatusHistory || [],
        }, summary: Object.assign(Object.assign({}, (orderSummaryDoc || {})), { promo: (orderSummaryDoc === null || orderSummaryDoc === void 0 ? void 0 : orderSummaryDoc.promo) || null }), meta: plainOrder.meta || null });
}
