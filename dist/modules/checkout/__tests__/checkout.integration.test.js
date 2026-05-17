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
const crypto_1 = require("crypto");
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const mongoose_1 = __importDefault(require("mongoose"));
const mongodb_memory_server_1 = require("mongodb-memory-server");
vitest_1.vi.hoisted(() => {
    process.env.JWT_SECRET = "test-access-secret-minimum-32-characters";
    process.env.JWT_REFRESH_SECRET = "test-refresh-secret-minimum-32-characters";
    process.env.JWT_ACCESS_EXPIRES_IN = "15m";
    process.env.JWT_REFRESH_EXPIRES_IN = "7d";
    process.env.JWT_ISSUER = "rest-api-node";
    process.env.JWT_AUDIENCE = "rest-api-node-client";
    process.env.NODE_ENV = "test";
});
const app_1 = __importDefault(require("../../../app"));
const user_model_1 = __importDefault(require("../../users/user.model"));
const category_model_1 = __importDefault(require("../../categories/category.model"));
const product_model_1 = __importDefault(require("../../products/product.model"));
const cart_model_1 = __importDefault(require("../../cart/cart.model"));
const order_model_1 = __importDefault(require("../../orders/order.model"));
const payment_model_1 = __importDefault(require("../../payments/payment.model"));
const coupon_model_1 = __importDefault(require("../../coupons/coupon.model"));
const coupon_usage_model_1 = __importDefault(require("../../coupons/coupon-usage.model"));
const delivery_setting_model_1 = __importDefault(require("../../inventory/delivery-setting.model"));
let mongo;
const getId = (doc) => String(doc._id);
const uniqueEmail = (prefix) => {
    return `${prefix}-${(0, crypto_1.randomUUID)()}@example.com`;
};
const uniqueName = (prefix) => {
    return `${prefix}-${(0, crypto_1.randomUUID)().slice(0, 8)}`;
};
const uniqueCode = (prefix) => {
    return `${prefix}-${(0, crypto_1.randomUUID)().slice(0, 8)}`.toUpperCase();
};
const futureDate = (days = 7) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
};
const registerAndGetToken = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (role = "CUSTOMER") {
    const email = uniqueEmail(role.toLowerCase());
    const password = "Password123";
    const register = yield (0, supertest_1.default)(app_1.default)
        .post("/api/v1/register")
        .send({
        name: `${role} User`,
        email,
        password,
    });
    (0, vitest_1.expect)(register.status).toBe(201);
    if (role !== "CUSTOMER") {
        yield user_model_1.default.findOneAndUpdate({ email }, { role });
    }
    const login = yield (0, supertest_1.default)(app_1.default)
        .post("/api/v1/login")
        .send({
        identifier: email,
        password,
    });
    (0, vitest_1.expect)(login.status).toBe(200);
    return {
        accessToken: login.body.accessToken,
        user: login.body.user,
        email,
    };
});
const createCategory = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (name = uniqueName("Category")) {
    return category_model_1.default.create({
        categoryId: name.toLowerCase().replace(/\s+/g, "-"),
        categoryName: name,
        description: "Test category",
    });
});
const createProduct = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (overrides = {}) {
    var _a, _b, _c;
    const category = yield createCategory();
    const seller = yield user_model_1.default.create({
        name: uniqueName("Seller"),
        email: uniqueEmail("seller"),
        password: "Password123",
        role: "ADMIN",
        status: "ACTIVE",
    });
    return product_model_1.default.create({
        name: overrides.name || uniqueName("Product"),
        category: getId(category),
        seller: getId(seller),
        price: (_a = overrides.price) !== null && _a !== void 0 ? _a : 100,
        stock: (_b = overrides.stock) !== null && _b !== void 0 ? _b : 10,
        status: (_c = overrides.status) !== null && _c !== void 0 ? _c : "Published",
        images: [],
        tag: [],
        description: "Test product",
        dedupeKey: (0, crypto_1.randomUUID)(),
    });
});
const createDeliverySetting = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (overrides = {}) {
    var _a, _b, _c, _d;
    return delivery_setting_model_1.default.create({
        method: overrides.method || uniqueName("standard"),
        baseFee: (_a = overrides.baseFee) !== null && _a !== void 0 ? _a : 5,
        freeThreshold: overrides.freeThreshold,
        estimatedDays: (_b = overrides.estimatedDays) !== null && _b !== void 0 ? _b : 3,
        isActive: (_c = overrides.isActive) !== null && _c !== void 0 ? _c : true,
        code: (_d = overrides.code) !== null && _d !== void 0 ? _d : uniqueCode("DEL"),
    });
});
const createPromo = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (overrides = {}) {
    var _a, _b, _c;
    return coupon_model_1.default.create({
        code: overrides.code || uniqueCode("PROMO"),
        discountType: overrides.discountType || "percentage",
        discountValue: (_a = overrides.discountValue) !== null && _a !== void 0 ? _a : 10,
        expiresAt: overrides.expiresAt || futureDate(7),
        isActive: (_b = overrides.isActive) !== null && _b !== void 0 ? _b : true,
        maxUsesPerUser: (_c = overrides.maxUsesPerUser) !== null && _c !== void 0 ? _c : 1,
    });
});
const addProductToCart = (accessToken_1, productId_1, ...args_1) => __awaiter(void 0, [accessToken_1, productId_1, ...args_1], void 0, function* (accessToken, productId, quantity = 1) {
    const res = yield (0, supertest_1.default)(app_1.default)
        .post("/api/v1/cart/add")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
        productId,
        quantity,
    });
    (0, vitest_1.expect)(res.status).toBe(200);
    return res;
});
const selectDelivery = (accessToken, method) => __awaiter(void 0, void 0, void 0, function* () {
    const res = yield (0, supertest_1.default)(app_1.default)
        .post("/api/v1/cart/select-delivery")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ method });
    (0, vitest_1.expect)(res.status).toBe(200);
    return res;
});
const applyPromo = (accessToken, code) => __awaiter(void 0, void 0, void 0, function* () {
    const res = yield (0, supertest_1.default)(app_1.default)
        .post("/api/v1/cart/apply-promo")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ code });
    (0, vitest_1.expect)(res.status).toBe(200);
    return res;
});
(0, vitest_1.beforeAll)(() => __awaiter(void 0, void 0, void 0, function* () {
    mongo = yield mongodb_memory_server_1.MongoMemoryServer.create();
    if (mongoose_1.default.connection.readyState !== 0) {
        yield mongoose_1.default.disconnect();
    }
    yield mongoose_1.default.connect(mongo.getUri());
}));
(0, vitest_1.afterEach)(() => __awaiter(void 0, void 0, void 0, function* () {
    yield payment_model_1.default.deleteMany({});
    yield order_model_1.default.deleteMany({});
    yield cart_model_1.default.deleteMany({});
    yield coupon_usage_model_1.default.deleteMany({});
    yield coupon_model_1.default.deleteMany({});
    yield delivery_setting_model_1.default.deleteMany({});
    yield product_model_1.default.deleteMany({}).setOptions({ withDeleted: true });
    yield category_model_1.default.deleteMany({});
    yield user_model_1.default.deleteMany({});
}));
(0, vitest_1.afterAll)(() => __awaiter(void 0, void 0, void 0, function* () {
    yield mongoose_1.default.disconnect();
    yield mongo.stop();
}));
(0, vitest_1.describe)("Checkout API", () => {
    (0, vitest_1.it)("rejects checkout without token", () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default).post("/api/v1/checkout").send({});
        (0, vitest_1.expect)(res.status).toBe(401);
        (0, vitest_1.expect)(res.body.message).toBe("Authentication required");
    }));
    (0, vitest_1.it)("rejects checkout with empty cart", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/checkout")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            paymentMethod: "NORMAL_PAYMENT",
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.message).toBe("Cart is empty.");
    }));
    (0, vitest_1.it)("rejects checkout when no delivery method exists", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct({ price: 100, stock: 10 });
        yield addProductToCart(customer.accessToken, getId(product), 1);
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/checkout")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            paymentMethod: "NORMAL_PAYMENT",
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.message).toBe("No delivery methods are currently available.");
    }));
    (0, vitest_1.it)("rejects checkout when product stock is not enough", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct({ price: 100, stock: 1 });
        yield createDeliverySetting({
            method: "standard",
            baseFee: 5,
            estimatedDays: 3,
            isActive: true,
        });
        yield addProductToCart(customer.accessToken, getId(product), 2);
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/checkout")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            paymentMethod: "NORMAL_PAYMENT",
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.message).toBe(`Not enough stock for ${product.name}.`);
    }));
    (0, vitest_1.it)("creates order successfully", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct({ price: 100, stock: 10 });
        yield createDeliverySetting({
            method: "standard",
            baseFee: 5,
            estimatedDays: 3,
            isActive: true,
        });
        yield addProductToCart(customer.accessToken, getId(product), 1);
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/checkout")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            paymentMethod: "NORMAL_PAYMENT",
        });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.order).toBeTruthy();
        (0, vitest_1.expect)(res.body.order.user).toBe(customer.user.id);
        (0, vitest_1.expect)(res.body.order.items.length).toBe(1);
        (0, vitest_1.expect)(res.body.order.items[0].product).toBe(getId(product));
        (0, vitest_1.expect)(res.body.order.status).toBe("PENDING_PAYMENT");
        (0, vitest_1.expect)(res.body.order.subTotal).toBe(100);
        (0, vitest_1.expect)(res.body.order.deliveryFee).toBe(5);
        (0, vitest_1.expect)(res.body.order.serviceTax).toBe(10);
        (0, vitest_1.expect)(res.body.order.total).toBe(115);
        const dbOrder = yield order_model_1.default.findById(res.body.order._id);
        (0, vitest_1.expect)(dbOrder).toBeTruthy();
    }));
    (0, vitest_1.it)("creates payment successfully", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct({ price: 100, stock: 10 });
        yield createDeliverySetting({
            method: "standard",
            baseFee: 5,
            estimatedDays: 3,
            isActive: true,
        });
        yield addProductToCart(customer.accessToken, getId(product), 1);
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/checkout")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            paymentMethod: "NORMAL_PAYMENT",
            currency: "USD",
        });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.payment).toBeTruthy();
        (0, vitest_1.expect)(res.body.payment.order).toBe(res.body.order._id);
        (0, vitest_1.expect)(res.body.payment.user).toBe(customer.user.id);
        (0, vitest_1.expect)(res.body.payment.method).toBe("NORMAL_PAYMENT");
        (0, vitest_1.expect)(res.body.payment.provider).toBe("NORMAL_PAYMENT");
        (0, vitest_1.expect)(res.body.payment.status).toBe("PENDING");
        (0, vitest_1.expect)(res.body.payment.amount).toBe(res.body.order.total);
        (0, vitest_1.expect)(res.body.payment.currency).toBe("USD");
        (0, vitest_1.expect)(res.body.payment.transactionId).toBeTruthy();
        (0, vitest_1.expect)(res.body.payment.checkoutData.message).toContain("Payment created");
        const dbPayment = yield payment_model_1.default.findById(res.body.payment._id);
        (0, vitest_1.expect)(dbPayment).toBeTruthy();
    }));
    (0, vitest_1.it)("clears cart after checkout", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct({ price: 100, stock: 10 });
        yield createDeliverySetting({
            method: "standard",
            baseFee: 5,
            estimatedDays: 3,
            isActive: true,
        });
        yield addProductToCart(customer.accessToken, getId(product), 2);
        const checkout = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/checkout")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            paymentMethod: "NORMAL_PAYMENT",
        });
        (0, vitest_1.expect)(checkout.status).toBe(201);
        const cart = yield (0, supertest_1.default)(app_1.default)
            .get("/api/v1/cart")
            .set("Authorization", `Bearer ${customer.accessToken}`);
        (0, vitest_1.expect)(cart.status).toBe(200);
        (0, vitest_1.expect)(cart.body.items).toEqual([]);
        (0, vitest_1.expect)(cart.body.summary.subTotal).toBe(0);
        (0, vitest_1.expect)(cart.body.summary.discount).toBe(0);
        (0, vitest_1.expect)(cart.body.summary.serviceTax).toBe(0);
        (0, vitest_1.expect)(cart.body.summary.total).toBe(0);
        const dbCart = yield cart_model_1.default.findOne({ user: customer.user.id });
        (0, vitest_1.expect)(dbCart === null || dbCart === void 0 ? void 0 : dbCart.items.length).toBe(0);
    }));
    (0, vitest_1.it)("preserves selected delivery in order", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct({ price: 100, stock: 10 });
        yield createDeliverySetting({
            method: "express",
            baseFee: 7,
            estimatedDays: 1,
            isActive: true,
        });
        yield addProductToCart(customer.accessToken, getId(product), 1);
        yield selectDelivery(customer.accessToken, "express");
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/checkout")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            paymentMethod: "NORMAL_PAYMENT",
        });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.order.delivery.method).toBe("express");
        (0, vitest_1.expect)(res.body.order.delivery.baseFee).toBe(7);
        (0, vitest_1.expect)(res.body.order.delivery.estimatedDays).toBe(1);
        (0, vitest_1.expect)(res.body.order.deliveryFee).toBe(7);
    }));
    (0, vitest_1.it)("preserves promo summary in order", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct({ price: 100, stock: 10 });
        yield createDeliverySetting({
            method: "standard",
            baseFee: 5,
            estimatedDays: 3,
            isActive: true,
        });
        yield createPromo({
            code: "CHECKOUT10",
            discountType: "percentage",
            discountValue: 10,
            maxUsesPerUser: 2,
        });
        yield addProductToCart(customer.accessToken, getId(product), 2);
        yield applyPromo(customer.accessToken, "CHECKOUT10");
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/checkout")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            paymentMethod: "NORMAL_PAYMENT",
        });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.order.subTotal).toBe(200);
        (0, vitest_1.expect)(res.body.order.discount).toBe(20);
        (0, vitest_1.expect)(res.body.order.summary.promoCode).toBe("CHECKOUT10");
        (0, vitest_1.expect)(res.body.order.summary.promo.code).toBe("CHECKOUT10");
        (0, vitest_1.expect)(res.body.order.summary.promo.type).toBe("percentage");
        (0, vitest_1.expect)(res.body.order.summary.promo.value).toBe(10);
        (0, vitest_1.expect)(res.body.order.summary.promo.amount).toBe(20);
    }));
    (0, vitest_1.it)("increments promo usage after checkout", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct({ price: 100, stock: 10 });
        yield createDeliverySetting({
            method: "standard",
            baseFee: 5,
            estimatedDays: 3,
            isActive: true,
        });
        const promo = yield createPromo({
            code: "USAGE10",
            discountType: "percentage",
            discountValue: 10,
            maxUsesPerUser: 2,
        });
        yield addProductToCart(customer.accessToken, getId(product), 1);
        yield applyPromo(customer.accessToken, "USAGE10");
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/checkout")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            paymentMethod: "NORMAL_PAYMENT",
        });
        (0, vitest_1.expect)(res.status).toBe(201);
        const usage = yield coupon_usage_model_1.default.findOne({
            user: customer.user.id,
            promoCode: getId(promo),
        });
        (0, vitest_1.expect)(usage).toBeTruthy();
        (0, vitest_1.expect)(usage === null || usage === void 0 ? void 0 : usage.usageCount).toBe(1);
    }));
    (0, vitest_1.it)("supports shipping address", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct({ price: 100, stock: 10 });
        yield createDeliverySetting({
            method: "standard",
            baseFee: 5,
            estimatedDays: 3,
            isActive: true,
        });
        yield addProductToCart(customer.accessToken, getId(product), 1);
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/checkout")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            paymentMethod: "NORMAL_PAYMENT",
            shippingAddress: {
                fullName: "Rak Smey",
                phone: "012345678",
                email: "rak@example.com",
                line1: "Street 123",
                line2: "Floor 2",
                city: "Phnom Penh",
                country: "Cambodia",
                postalCode: "12000",
            },
        });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.order.shippingAddress.fullName).toBe("Rak Smey");
        (0, vitest_1.expect)(res.body.order.shippingAddress.line1).toBe("Street 123");
        (0, vitest_1.expect)(res.body.order.shippingAddress.line2).toBe("Floor 2");
        (0, vitest_1.expect)(res.body.order.shippingAddress.city).toBe("Phnom Penh");
        (0, vitest_1.expect)(res.body.order.shippingAddress.country).toBe("Cambodia");
        (0, vitest_1.expect)(res.body.order.shippingAddress.postalCode).toBe("12000");
    }));
    (0, vitest_1.it)("supports contact details", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct({ price: 100, stock: 10 });
        yield createDeliverySetting({
            method: "standard",
            baseFee: 5,
            estimatedDays: 3,
            isActive: true,
        });
        yield addProductToCart(customer.accessToken, getId(product), 1);
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/checkout")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            paymentMethod: "NORMAL_PAYMENT",
            contact: {
                fullName: "Checkout Customer",
                email: "checkout@example.com",
                phone: "098765432",
            },
        });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.order.contact.fullName).toBe("Checkout Customer");
        (0, vitest_1.expect)(res.body.order.contact.email).toBe("checkout@example.com");
        (0, vitest_1.expect)(res.body.order.contact.phone).toBe("098765432");
    }));
    (0, vitest_1.it)("supports payment method", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct({ price: 100, stock: 10 });
        yield createDeliverySetting({
            method: "standard",
            baseFee: 5,
            estimatedDays: 3,
            isActive: true,
        });
        yield addProductToCart(customer.accessToken, getId(product), 1);
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/checkout")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            paymentMethod: "CASH_ON_DELIVERY",
            currency: "USD",
        });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.order.payment.method).toBe("CASH_ON_DELIVERY");
        (0, vitest_1.expect)(res.body.order.payment.status).toBe("PENDING");
        (0, vitest_1.expect)(res.body.payment.method).toBe("CASH_ON_DELIVERY");
        (0, vitest_1.expect)(res.body.payment.status).toBe("PENDING");
    }));
    (0, vitest_1.it)("rejects unsupported payment method", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct({ price: 100, stock: 10 });
        yield createDeliverySetting({
            method: "standard",
            baseFee: 5,
            estimatedDays: 3,
            isActive: true,
        });
        yield addProductToCart(customer.accessToken, getId(product), 1);
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/checkout")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            paymentMethod: "CRYPTO",
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.message).toBe("Unsupported payment method");
    }));
});
