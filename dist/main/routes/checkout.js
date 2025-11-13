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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongoose_1 = require("mongoose");
const Cart_1 = __importDefault(require("../../models/Cart"));
const DeliverySetting_1 = __importDefault(require("../../models/DeliverySetting"));
const Order_1 = __importDefault(require("../../models/Order"));
const auth_1 = require("../../middleware/auth");
const cartTotals_1 = require("../utils/cartTotals");
const cache_1 = require("../utils/cache");
const router = (0, express_1.Router)();
const ORDER_STATUS_FLOW = [
    {
        status: "pending",
        message: "Order created, awaiting payment.",
    },
    {
        status: "processing",
        message: "Payment received, preparing for shipment.",
    },
    {
        status: "shipped",
        message: "Order shipped to carrier.",
    },
    {
        status: "delivered",
        message: "Order delivered to customer.",
    },
];
const PAYMENT_STATUSES = [
    "pending",
    "authorized",
    "paid",
    "failed",
    "refunded",
];
function toTrimmedString(value) {
    if (value === undefined || value === null)
        return undefined;
    const str = String(value).trim();
    return str.length > 0 ? str : undefined;
}
function headerToString(value) {
    if (Array.isArray(value)) {
        return value[0];
    }
    return value === null || value === void 0 ? void 0 : value.toString();
}
function coalesceString(source, keys) {
    if (!source)
        return undefined;
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            const value = toTrimmedString(source[key]);
            if (value)
                return value;
        }
    }
    return undefined;
}
function normalizeContact(payload) {
    if (!payload)
        return undefined;
    const firstName = toTrimmedString(payload.firstName);
    const lastName = toTrimmedString(payload.lastName);
    let fullName = toTrimmedString(payload.fullName) || toTrimmedString(payload.name);
    if (!fullName && (firstName || lastName)) {
        fullName = [firstName, lastName].filter(Boolean).join(" ");
    }
    const email = toTrimmedString(payload.email) || toTrimmedString(payload.contactEmail);
    const phone = toTrimmedString(payload.phone) ||
        toTrimmedString(payload.contactPhone) ||
        toTrimmedString(payload.contactNumber) ||
        toTrimmedString(payload.mobile);
    if (!fullName && !email && !phone) {
        return undefined;
    }
    const contact = {};
    if (fullName)
        contact.fullName = fullName;
    if (email)
        contact.email = email;
    if (phone)
        contact.phone = phone;
    return contact;
}
function normalizeAddress(payload, fallbackContact) {
    if (!payload)
        return undefined;
    const record = payload;
    const line1 = coalesceString(record, [
        "line1",
        "address1",
        "addressLine1",
        "street",
        "street1",
        "streetAddress",
        "address",
    ]);
    const country = coalesceString(record, [
        "country",
        "countryCode",
        "countryName",
    ]);
    if (!line1 || !country) {
        throw new Error("Shipping address requires line1 and country.");
    }
    const normalized = {
        line1,
        country,
    };
    const fullName = coalesceString(record, ["fullName", "name", "recipientName"]) ||
        (fallbackContact === null || fallbackContact === void 0 ? void 0 : fallbackContact.fullName);
    if (fullName)
        normalized.fullName = fullName;
    const phone = coalesceString(record, [
        "phone",
        "contactNumber",
        "contactPhone",
        "mobile",
    ]) || (fallbackContact === null || fallbackContact === void 0 ? void 0 : fallbackContact.phone);
    if (phone)
        normalized.phone = phone;
    const line2 = coalesceString(record, [
        "line2",
        "address2",
        "addressLine2",
        "street2",
        "apartment",
        "suite",
    ]);
    if (line2)
        normalized.line2 = line2;
    const city = coalesceString(record, ["city", "town"]);
    if (city)
        normalized.city = city;
    const state = coalesceString(record, ["state", "province", "region"]);
    if (state)
        normalized.state = state;
    const postalCode = coalesceString(record, [
        "postalCode",
        "zip",
        "zipCode",
        "postcode",
    ]);
    if (postalCode)
        normalized.postalCode = postalCode;
    const type = coalesceString(record, ["type", "addressType"]);
    if (type)
        normalized.type = type;
    if (record.isDefault !== undefined) {
        if (typeof record.isDefault === "string") {
            normalized.isDefault = record.isDefault.toLowerCase() === "true";
        }
        else {
            normalized.isDefault = Boolean(record.isDefault);
        }
    }
    return normalized;
}
function normalizePayment(body) {
    var _a, _b;
    const nested = body.payment || undefined;
    const method = toTrimmedString(body.paymentMethod) ||
        (nested &&
            coalesceString(nested, [
                "method",
                "type",
                "provider",
                "name",
            ]));
    const transactionId = toTrimmedString(body.transactionId) ||
        (nested &&
            coalesceString(nested, [
                "transactionId",
                "reference",
                "id",
            ]));
    const statusCandidate = (_a = body.paymentStatus) !== null && _a !== void 0 ? _a : (nested && nested.status);
    let status = PAYMENT_STATUSES[0];
    if (statusCandidate) {
        const normalized = toTrimmedString(statusCandidate);
        if (normalized &&
            PAYMENT_STATUSES.includes(normalized.toLowerCase())) {
            status = normalized.toLowerCase();
        }
    }
    const currency = toTrimmedString(nested === null || nested === void 0 ? void 0 : nested.currency) ||
        toTrimmedString(body.currency);
    const paidAtRaw = (_b = nested === null || nested === void 0 ? void 0 : nested.paidAt) !== null && _b !== void 0 ? _b : body === null || body === void 0 ? void 0 : body.paidAt;
    const paidAtDate = paidAtRaw ? new Date(paidAtRaw) : null;
    const payment = { status };
    if (method)
        payment.method = method;
    if (transactionId)
        payment.transactionId = transactionId;
    if (currency)
        payment.currency = currency;
    if (paidAtDate && !Number.isNaN(paidAtDate.getTime())) {
        payment.paidAt = paidAtDate;
    }
    if (!payment.currency) {
        payment.currency = "USD";
    }
    return payment;
}
function buildPromoSummary(promo, discountAmount) {
    var _a, _b;
    if (!promo)
        return null;
    const promoDoc = typeof (promo === null || promo === void 0 ? void 0 : promo.toObject) === "function" ? promo.toObject() : promo;
    const codeCandidate = typeof promoDoc === "string"
        ? promoDoc
        : (_b = (_a = promoDoc === null || promoDoc === void 0 ? void 0 : promoDoc.code) !== null && _a !== void 0 ? _a : promoDoc === null || promoDoc === void 0 ? void 0 : promoDoc.Code) !== null && _b !== void 0 ? _b : null;
    const code = toTrimmedString(codeCandidate);
    if (!code)
        return null;
    const summary = { code };
    if (promoDoc === null || promoDoc === void 0 ? void 0 : promoDoc.discountType)
        summary.type = promoDoc.discountType;
    if (typeof (promoDoc === null || promoDoc === void 0 ? void 0 : promoDoc.discountValue) === "number") {
        summary.value = promoDoc.discountValue;
    }
    if (typeof (promoDoc === null || promoDoc === void 0 ? void 0 : promoDoc.maxUsesPerUser) === "number") {
        summary.maxUsesPerUser = promoDoc.maxUsesPerUser;
    }
    if (promoDoc === null || promoDoc === void 0 ? void 0 : promoDoc.expiresAt)
        summary.expiresAt = promoDoc.expiresAt;
    const normalizedAmount = Number(discountAmount || (promoDoc === null || promoDoc === void 0 ? void 0 : promoDoc.discountAmount));
    if (!Number.isNaN(normalizedAmount))
        summary.amount = normalizedAmount;
    return summary;
}
function resolveDelivery(cart, options) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const { methodId, method } = options;
        const byId = methodId
            ? yield DeliverySetting_1.default.findById(methodId).lean()
            : null;
        if (byId) {
            return {
                setting: byId._id,
                method: byId.method,
                baseFee: byId.baseFee,
                estimatedDays: byId.estimatedDays,
                code: byId.code,
                carrier: undefined,
                trackingNumber: undefined,
                trackingUrl: undefined,
                estimatedDeliveryDate: null,
            };
        }
        const byMethod = method
            ? yield DeliverySetting_1.default.findOne({ method, isActive: true }).lean()
            : null;
        if (byMethod) {
            return {
                setting: byMethod._id,
                method: byMethod.method,
                baseFee: byMethod.baseFee,
                estimatedDays: byMethod.estimatedDays,
                code: byMethod.code,
                carrier: undefined,
                trackingNumber: undefined,
                trackingUrl: undefined,
                estimatedDeliveryDate: null,
            };
        }
        const populated = cart === null || cart === void 0 ? void 0 : cart.delivery;
        if (populated && populated.method) {
            const rawId = (_b = (_a = populated._id) !== null && _a !== void 0 ? _a : populated.id) !== null && _b !== void 0 ? _b : null;
            const normalizedId = rawId instanceof mongoose_1.Types.ObjectId
                ? rawId
                : typeof rawId === "string" && mongoose_1.Types.ObjectId.isValid(rawId)
                    ? new mongoose_1.Types.ObjectId(rawId)
                    : null;
            return {
                setting: normalizedId,
                method: populated.method,
                baseFee: populated.baseFee,
                estimatedDays: populated.estimatedDays,
                code: populated.code,
                carrier: populated.carrier,
                trackingNumber: populated.trackingNumber,
                trackingUrl: populated.trackingUrl,
                estimatedDeliveryDate: populated.estimatedDeliveryDate,
            };
        }
        const existingId = cart === null || cart === void 0 ? void 0 : cart.delivery;
        if (existingId && mongoose_1.Types.ObjectId.isValid(existingId)) {
            const doc = yield DeliverySetting_1.default.findById(existingId).lean();
            if (doc) {
                return {
                    setting: doc._id,
                    method: doc.method,
                    baseFee: doc.baseFee,
                    estimatedDays: doc.estimatedDays,
                    code: doc.code,
                    carrier: undefined,
                    trackingNumber: undefined,
                    trackingUrl: undefined,
                    estimatedDeliveryDate: null,
                };
            }
        }
        const fallback = yield DeliverySetting_1.default.findOne({ isActive: true }).lean();
        if (!fallback)
            return undefined;
        return {
            setting: fallback._id,
            method: fallback.method,
            baseFee: fallback.baseFee,
            estimatedDays: fallback.estimatedDays,
            code: fallback.code,
            carrier: undefined,
            trackingNumber: undefined,
            trackingUrl: undefined,
            estimatedDeliveryDate: null,
        };
    });
}
router.post("/checkout", auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    const body = req.body;
    try {
        const cart = yield Cart_1.default.findOne({ user: req.user.id })
            .populate("items.product")
            .populate("promoCode")
            .populate("delivery");
        if (!cart || cart.items.length === 0) {
            res.status(400).json({ error: "Cart is empty." });
            return;
        }
        const deliveryOption = body.deliverySelection || body.delivery || null;
        const deliveryOptionRecord = deliveryOption || null;
        const delivery = yield resolveDelivery(cart, {
            methodId: toTrimmedString(body.deliveryMethodId) ||
                coalesceString(deliveryOptionRecord, ["id", "_id", "setting"]),
            method: toTrimmedString(body.deliveryMethod) ||
                coalesceString(deliveryOptionRecord, ["method"]),
        });
        if (!delivery) {
            res
                .status(400)
                .json({ error: "No delivery methods are currently available." });
            return;
        }
        const items = cart.items.map((item) => {
            const productDoc = item.product;
            return {
                rawProduct: productDoc,
                quantity: item.quantity,
            };
        });
        for (const { rawProduct, quantity } of items) {
            if (!rawProduct || rawProduct.isDeleted) {
                res.status(400).json({ error: "One of the products is unavailable." });
                return;
            }
            if (typeof rawProduct.stock === "number" && rawProduct.stock < quantity) {
                res.status(400).json({
                    error: `Not enough stock for ${rawProduct.name}.`,
                });
                return;
            }
        }
        const subTotal = cart.items.reduce((acc, item) => {
            var _a;
            const price = ((_a = item.product) === null || _a === void 0 ? void 0 : _a.price) || 0;
            return acc + price * item.quantity;
        }, 0);
        const discount = cart.discount || 0;
        const deliveryMethod = delivery.method || "standard";
        const { serviceTax, deliveryFee, total } = yield (0, cartTotals_1.calculateCartTotals)(subTotal, discount, deliveryMethod);
        const promoSummary = buildPromoSummary(cart.promoCode, discount);
        const taxableBase = Math.max(subTotal - discount, 0);
        const taxRate = taxableBase > 0 ? Number((serviceTax / taxableBase).toFixed(4)) : 0;
        const orderSummary = {
            subTotal,
            discount,
            deliveryFee,
            serviceTax,
            total,
            taxRate,
            promoCode: (_a = promoSummary === null || promoSummary === void 0 ? void 0 : promoSummary.code) !== null && _a !== void 0 ? _a : null,
            promo: promoSummary,
        };
        const contactDetails = normalizeContact(body.contact) ||
            normalizeContact(body.personalDetails) ||
            normalizeContact(body.customer) ||
            normalizeContact(body.shippingAddress) ||
            normalizeContact(body.address);
        const shippingAddress = normalizeAddress(body.shippingAddress ||
            body.address, contactDetails);
        const payment = normalizePayment(body);
        const now = new Date();
        const statusHistory = ORDER_STATUS_FLOW.map(({ status, message }, index) => ({
            status,
            message,
            updatedAt: index === 0 ? now : undefined,
        }));
        const forwardedFor = headerToString(req.headers["x-forwarded-for"]);
        const secChUa = headerToString(req.headers["sec-ch-ua"]);
        const secChUaPlatform = headerToString(req.headers["sec-ch-ua-platform"]);
        const userAgentHeader = (typeof req.get === "function" && req.get("user-agent")) ||
            headerToString(req.headers["user-agent"]);
        const locationHeader = headerToString(req.headers["x-app-location"]);
        const orderPayload = {
            user: req.user.id,
            items: cart.items.map((item) => {
                const productDoc = item.product;
                return {
                    product: productDoc._id,
                    name: productDoc.name,
                    slug: productDoc.slug,
                    image: Array.isArray(productDoc.images)
                        ? productDoc.images[0]
                        : undefined,
                    price: productDoc.price,
                    quantity: item.quantity,
                };
            }),
            subTotal,
            discount,
            deliveryFee,
            serviceTax,
            total,
            status: (_c = (_b = statusHistory[0]) === null || _b === void 0 ? void 0 : _b.status) !== null && _c !== void 0 ? _c : "pending",
            statusHistory,
            summary: orderSummary,
            payment,
            shippingAddress,
            delivery,
            promoCode: cart.promoCode && typeof cart.promoCode._id !== "undefined"
                ? cart.promoCode._id
                : cart.promoCode || null,
            notes: ((_d = body.notes) === null || _d === void 0 ? void 0 : _d.toString().trim()) || undefined,
            contact: contactDetails,
            meta: {
                ip: (forwardedFor === null || forwardedFor === void 0 ? void 0 : forwardedFor.split(",")[0].trim()) ||
                    req.ip ||
                    ((_e = req.socket) === null || _e === void 0 ? void 0 : _e.remoteAddress) ||
                    null,
                device: secChUa && secChUaPlatform
                    ? `${secChUa} on ${secChUaPlatform}`
                    : null,
                userAgent: userAgentHeader || null,
                location: locationHeader || null,
            },
        };
        if (shippingAddress)
            orderPayload.shippingAddress = shippingAddress;
        if (contactDetails)
            orderPayload.contact = contactDetails;
        const order = new Order_1.default(orderPayload);
        yield order.save();
        for (const { rawProduct, quantity } of items) {
            if (typeof rawProduct.stock === "number") {
                rawProduct.stock = Math.max(0, rawProduct.stock - quantity);
            }
            if (typeof rawProduct.salesCount === "number") {
                rawProduct.salesCount += quantity;
            }
            else {
                rawProduct.salesCount = quantity;
            }
            yield rawProduct.save();
        }
        cart.items = [];
        cart.subTotal = 0;
        cart.discount = 0;
        cart.serviceTax = 0;
        cart.deliveryFee = 0;
        cart.total = 0;
        cart.promoCode = null;
        cart.delivery = ((_f = delivery.setting) !== null && _f !== void 0 ? _f : null);
        yield cart.save();
        const emptyCartPayload = {
            items: [],
            promoCode: null,
            delivery: cart.delivery,
            summary: {
                subTotal: 0,
                discount: 0,
                deliveryFee: 0,
                serviceTax: 0,
                total: 0,
                taxRate: 0,
                promoCode: null,
                promo: null,
            },
        };
        yield (0, cache_1.setCachedCart)(req.user.id, emptyCartPayload);
        yield (0, cache_1.invalidateCart)(req.user.id);
        const plainOrder = order.toObject({ virtuals: false });
        delete plainOrder.__v;
        const _m = plainOrder, { statusHistory: storedStatusHistory, payment: orderPayment, delivery: orderDelivery, summary: orderSummaryDoc } = _m, orderRest = __rest(_m, ["statusHistory", "payment", "delivery", "summary"]);
        const responseOrder = Object.assign(Object.assign({}, orderRest), { payment: Object.assign(Object.assign({}, (orderPayment || {})), { method: (_g = orderPayment === null || orderPayment === void 0 ? void 0 : orderPayment.method) !== null && _g !== void 0 ? _g : null, status: (orderPayment === null || orderPayment === void 0 ? void 0 : orderPayment.status) || "pending", transactionId: (_h = orderPayment === null || orderPayment === void 0 ? void 0 : orderPayment.transactionId) !== null && _h !== void 0 ? _h : null, currency: (orderPayment === null || orderPayment === void 0 ? void 0 : orderPayment.currency) || "USD", paidAt: (orderPayment === null || orderPayment === void 0 ? void 0 : orderPayment.paidAt) || null }), delivery: orderDelivery
                ? Object.assign(Object.assign({}, orderDelivery), { carrier: (_j = orderDelivery === null || orderDelivery === void 0 ? void 0 : orderDelivery.carrier) !== null && _j !== void 0 ? _j : null, trackingNumber: (_k = orderDelivery === null || orderDelivery === void 0 ? void 0 : orderDelivery.trackingNumber) !== null && _k !== void 0 ? _k : null, trackingUrl: (_l = orderDelivery === null || orderDelivery === void 0 ? void 0 : orderDelivery.trackingUrl) !== null && _l !== void 0 ? _l : null, estimatedDeliveryDate: (orderDelivery === null || orderDelivery === void 0 ? void 0 : orderDelivery.estimatedDeliveryDate) || null }) : undefined, status: {
                current: plainOrder.status,
                history: storedStatusHistory || [],
            }, summary: Object.assign(Object.assign({}, (orderSummaryDoc || {})), { promo: (orderSummaryDoc === null || orderSummaryDoc === void 0 ? void 0 : orderSummaryDoc.promo) || null }), meta: plainOrder.meta || null });
        res.status(201).json({
            message: "Order placed successfully.",
            order: responseOrder,
        });
    }
    catch (err) {
        console.error(err);
        if (err instanceof Error && err.message.includes("Shipping address")) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.status(500).json({ error: "Failed to complete checkout." });
    }
}));
exports.default = router;
