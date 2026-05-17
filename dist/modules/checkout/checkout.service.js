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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkoutService = void 0;
const mongoose_1 = require("mongoose");
const cart_model_1 = __importDefault(require("../cart/cart.model"));
const order_model_1 = __importDefault(require("../orders/order.model"));
const delivery_setting_model_1 = __importDefault(require("../inventory/delivery-setting.model"));
const coupon_model_1 = __importDefault(require("../coupons/coupon.model"));
const coupon_usage_model_1 = __importDefault(require("../coupons/coupon-usage.model"));
const cart_totals_1 = require("../../shared/helpers/cart-totals");
const cache_1 = require("../../infrastructure/redis/cache");
const app_error_1 = require("../../shared/errors/app-error");
const orderStatus_1 = require("../../shared/constants/orderStatus");
const paymentStatus_1 = require("../../shared/constants/paymentStatus");
const payment_service_1 = require("../payments/payment.service");
const toTrimmedString = (value) => {
    if (value === undefined || value === null)
        return undefined;
    const str = String(value).trim();
    return str.length ? str : undefined;
};
const coalesceString = (source, keys) => {
    if (!source)
        return undefined;
    for (const key of keys) {
        const value = toTrimmedString(source[key]);
        if (value)
            return value;
    }
    return undefined;
};
const normalizeContact = (payload) => {
    if (!payload)
        return undefined;
    const firstName = toTrimmedString(payload.firstName);
    const lastName = toTrimmedString(payload.lastName);
    const fullName = toTrimmedString(payload.fullName) || toTrimmedString(payload.name) || [firstName, lastName].filter(Boolean).join(" ");
    const email = toTrimmedString(payload.email) || toTrimmedString(payload.contactEmail);
    const phone = toTrimmedString(payload.phone) || toTrimmedString(payload.contactPhone) || toTrimmedString(payload.mobile);
    if (!fullName && !email && !phone)
        return undefined;
    return { fullName, email, phone };
};
const normalizeAddress = (payload, fallbackContact) => {
    if (!payload)
        return undefined;
    const line1 = coalesceString(payload, ["line1", "address1", "addressLine1", "street", "address"]);
    const country = coalesceString(payload, ["country", "countryCode", "countryName"]);
    if (!line1 || !country)
        throw new app_error_1.AppError("Shipping address requires line1 and country.", 400);
    return {
        fullName: coalesceString(payload, ["fullName", "name", "recipientName"]) || (fallbackContact === null || fallbackContact === void 0 ? void 0 : fallbackContact.fullName),
        phone: coalesceString(payload, ["phone", "contactNumber", "contactPhone", "mobile"]) || (fallbackContact === null || fallbackContact === void 0 ? void 0 : fallbackContact.phone),
        email: coalesceString(payload, ["email"]) || (fallbackContact === null || fallbackContact === void 0 ? void 0 : fallbackContact.email),
        line1,
        line2: coalesceString(payload, ["line2", "address2", "addressLine2", "apartment"]),
        city: coalesceString(payload, ["city", "town"]),
        state: coalesceString(payload, ["state", "province", "region"]),
        postalCode: coalesceString(payload, ["postalCode", "zip", "zipCode", "postcode"]),
        country,
        type: coalesceString(payload, ["type", "addressType"]),
        isDefault: Boolean(payload.isDefault),
    };
};
const buildPromoSummary = (promo, discountAmount) => {
    var _a;
    if (!promo)
        return null;
    const promoDoc = typeof (promo === null || promo === void 0 ? void 0 : promo.toObject) === "function" ? promo.toObject() : promo;
    const code = typeof promoDoc === "string" ? promoDoc : (_a = promoDoc === null || promoDoc === void 0 ? void 0 : promoDoc.code) !== null && _a !== void 0 ? _a : null;
    if (!code)
        return null;
    return {
        code,
        type: promoDoc.discountType,
        value: promoDoc.discountValue,
        amount: discountAmount,
        maxUsesPerUser: promoDoc.maxUsesPerUser,
        expiresAt: promoDoc.expiresAt,
    };
};
const firstImageUrl = (images) => {
    const first = Array.isArray(images) ? images[0] : undefined;
    if (!first)
        return undefined;
    return typeof first === "string" ? first : first.url;
};
const resolveDelivery = (cart, body) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const selection = body.deliverySelection || body.delivery || {};
    const methodId = toTrimmedString(body.deliveryMethodId) || toTrimmedString(selection.id) || toTrimmedString(selection._id) || toTrimmedString(selection.setting);
    const method = toTrimmedString(body.deliveryMethod) || toTrimmedString(selection.method);
    const doc = (methodId ? yield delivery_setting_model_1.default.findById(methodId).lean() : null) ||
        (method ? yield delivery_setting_model_1.default.findOne({ method, isActive: true }).lean() : null) ||
        (((_a = cart.delivery) === null || _a === void 0 ? void 0 : _a.method) ? cart.delivery : null) ||
        (yield delivery_setting_model_1.default.findOne({ isActive: true }).lean());
    if (!doc)
        return undefined;
    const rawId = doc._id || doc.id || null;
    return {
        setting: rawId && mongoose_1.Types.ObjectId.isValid(rawId) ? new mongoose_1.Types.ObjectId(String(rawId)) : null,
        method: doc.method,
        baseFee: doc.baseFee,
        estimatedDays: doc.estimatedDays,
        code: doc.code,
        carrier: undefined,
        trackingNumber: undefined,
        trackingUrl: undefined,
        estimatedDeliveryDate: null,
    };
});
const incrementPromoUsage = (userId, promoCodeId, maxUsesPerUser) => __awaiter(void 0, void 0, void 0, function* () {
    return coupon_usage_model_1.default.findOneAndUpdate({
        user: userId,
        promoCode: promoCodeId,
        $or: [{ usageCount: { $lt: maxUsesPerUser } }, { usageCount: { $exists: false } }],
    }, {
        $inc: { usageCount: 1 },
        $setOnInsert: { user: userId, promoCode: promoCodeId },
    }, { new: true, upsert: true });
});
exports.checkoutService = {
    checkout(userId, body) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            const cart = yield cart_model_1.default.findOne({ user: userId })
                .populate("items.product")
                .populate("promoCode")
                .populate("delivery");
            if (!cart || cart.items.length === 0)
                throw new app_error_1.AppError("Cart is empty.", 400);
            const delivery = yield resolveDelivery(cart, body);
            if (!delivery)
                throw new app_error_1.AppError("No delivery methods are currently available.", 400);
            for (const item of cart.items) {
                const product = item.product;
                if (!product || product.isDeleted)
                    throw new app_error_1.AppError("One of the products is unavailable.", 400);
                if (typeof product.stock === "number" && product.stock < item.quantity) {
                    throw new app_error_1.AppError(`Not enough stock for ${product.name}.`, 400);
                }
            }
            const subTotal = cart.items.reduce((acc, item) => { var _a; return acc + (((_a = item.product) === null || _a === void 0 ? void 0 : _a.price) || 0) * item.quantity; }, 0);
            const discount = cart.discount || 0;
            const { serviceTax, deliveryFee, total } = yield (0, cart_totals_1.calculateCartTotals)(subTotal, discount, delivery.method || "standard");
            const taxableBase = Math.max(subTotal - discount, 0);
            const taxRate = taxableBase > 0 ? Number((serviceTax / taxableBase).toFixed(4)) : 0;
            const promoSummary = buildPromoSummary(cart.promoCode, discount);
            let promoToConsume = null;
            if (cart.promoCode) {
                const promoRecord = typeof cart.promoCode.toObject === "function"
                    ? cart.promoCode
                    : yield coupon_model_1.default.findById(cart.promoCode);
                if (!promoRecord)
                    throw new app_error_1.AppError("Promo code not found.", 400);
                if (!promoRecord.isActive)
                    throw new app_error_1.AppError("Promo code is inactive.", 400);
                if (promoRecord.expiresAt < new Date())
                    throw new app_error_1.AppError("Promo code has expired.", 400);
                const usage = yield coupon_usage_model_1.default.findOne({ user: userId, promoCode: promoRecord._id });
                if (usage && usage.usageCount >= promoRecord.maxUsesPerUser) {
                    throw new app_error_1.AppError(`Promo code usage limit reached (${promoRecord.maxUsesPerUser} times).`, 400);
                }
                promoToConsume = { id: promoRecord._id, maxUsesPerUser: promoRecord.maxUsesPerUser };
            }
            const contact = normalizeContact(body.contact) ||
                normalizeContact(body.personalDetails) ||
                normalizeContact(body.customer) ||
                normalizeContact(body.shippingAddress) ||
                normalizeContact(body.address);
            const shippingAddress = normalizeAddress(body.shippingAddress || body.address, contact);
            const paymentMethod = payment_service_1.paymentService.normalizePaymentMethod(body.paymentMethod || ((_a = body.payment) === null || _a === void 0 ? void 0 : _a.method));
            const order = new order_model_1.default({
                user: userId,
                items: cart.items.map((item) => ({
                    product: item.product._id,
                    productId: item.product._id,
                    name: item.product.name,
                    slug: item.product.slug,
                    image: firstImageUrl(item.product.images),
                    price: item.product.price,
                    unitPrice: item.product.price,
                    totalPrice: (item.product.price || 0) * item.quantity,
                    quantity: item.quantity,
                })),
                subTotal,
                discount,
                deliveryFee,
                serviceTax,
                total,
                status: orderStatus_1.OrderStatus.PENDING_PAYMENT,
                statusHistory: [
                    {
                        status: orderStatus_1.OrderStatus.PENDING_PAYMENT,
                        message: "Order created, awaiting payment.",
                        updatedAt: new Date(),
                    },
                ],
                summary: {
                    subTotal,
                    discount,
                    deliveryFee,
                    serviceTax,
                    total,
                    taxRate,
                    promoCode: (_b = promoSummary === null || promoSummary === void 0 ? void 0 : promoSummary.code) !== null && _b !== void 0 ? _b : null,
                    promo: promoSummary,
                },
                payment: {
                    method: paymentMethod,
                    status: paymentStatus_1.PaymentStatus.PENDING,
                    currency: ((_c = body.payment) === null || _c === void 0 ? void 0 : _c.currency) || body.currency || "USD",
                    transactionId: body.transactionId,
                    paidAt: null,
                },
                shippingAddress,
                delivery,
                promoCode: cart.promoCode && typeof cart.promoCode._id !== "undefined"
                    ? cart.promoCode._id
                    : cart.promoCode || null,
                notes: ((_d = body.notes) === null || _d === void 0 ? void 0 : _d.toString().trim()) || undefined,
                contact,
            });
            yield order.save();
            if (promoToConsume) {
                const updated = yield incrementPromoUsage(userId, promoToConsume.id, promoToConsume.maxUsesPerUser);
                if (!updated) {
                    yield order_model_1.default.findByIdAndDelete(order._id);
                    throw new app_error_1.AppError(`Promo code usage limit reached (${promoToConsume.maxUsesPerUser} times).`, 400);
                }
            }
            const payment = yield payment_service_1.paymentService.createForOrder(order, paymentMethod);
            cart.items = [];
            cart.subTotal = 0;
            cart.discount = 0;
            cart.serviceTax = 0;
            cart.deliveryFee = 0;
            cart.total = 0;
            cart.promoCode = null;
            cart.delivery = ((_e = delivery.setting) !== null && _e !== void 0 ? _e : null);
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
            yield (0, cache_1.setCachedCart)(userId, emptyCartPayload);
            yield (0, cache_1.invalidateCart)(userId);
            return { order, payment };
        });
    },
};
