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
const cart_model_1 = __importDefault(require("../cart.model"));
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
const pastDate = (days = 1) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
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
const createDeliverySetting = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (overrides = {}) {
    var _a, _b, _c, _d;
    return delivery_setting_model_1.default.create({
        method: overrides.method || uniqueName("standard"),
        baseFee: (_a = overrides.baseFee) !== null && _a !== void 0 ? _a : 0,
        freeThreshold: overrides.freeThreshold,
        estimatedDays: (_b = overrides.estimatedDays) !== null && _b !== void 0 ? _b : 3,
        isActive: (_c = overrides.isActive) !== null && _c !== void 0 ? _c : true,
        // Avoid unique null conflicts in tests.
        code: (_d = overrides.code) !== null && _d !== void 0 ? _d : uniqueCode("DEL"),
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
(0, vitest_1.beforeAll)(() => __awaiter(void 0, void 0, void 0, function* () {
    mongo = yield mongodb_memory_server_1.MongoMemoryServer.create();
    if (mongoose_1.default.connection.readyState !== 0) {
        yield mongoose_1.default.disconnect();
    }
    yield mongoose_1.default.connect(mongo.getUri());
}));
(0, vitest_1.afterEach)(() => __awaiter(void 0, void 0, void 0, function* () {
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
(0, vitest_1.describe)("Cart Promo + Delivery API", () => {
    (0, vitest_1.it)("applies valid percentage promo code", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct({ price: 100 });
        const promo = yield createPromo({
            code: "SAVE10",
            discountType: "percentage",
            discountValue: 10,
        });
        yield addProductToCart(customer.accessToken, getId(product), 2);
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/cart/apply-promo")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            code: promo.code,
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.message).toBe("Promo code applied successfully.");
        (0, vitest_1.expect)(res.body.promo.code).toBe("SAVE10");
        (0, vitest_1.expect)(res.body.promo.type).toBe("percentage");
        (0, vitest_1.expect)(res.body.promo.value).toBe(10);
        (0, vitest_1.expect)(res.body.promo.amount).toBe(20);
        const cart = yield cart_model_1.default.findOne({ user: customer.user.id });
        (0, vitest_1.expect)(cart === null || cart === void 0 ? void 0 : cart.discount).toBe(20);
        (0, vitest_1.expect)(String(cart === null || cart === void 0 ? void 0 : cart.promoCode)).toBe(getId(promo));
    }));
    (0, vitest_1.it)("applies valid fixed promo code", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct({ price: 100 });
        const promo = yield createPromo({
            code: "FIXED5",
            discountType: "fixed",
            discountValue: 5,
        });
        yield addProductToCart(customer.accessToken, getId(product), 2);
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/cart/apply-promo")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            code: promo.code,
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.promo.code).toBe("FIXED5");
        (0, vitest_1.expect)(res.body.promo.type).toBe("fixed");
        (0, vitest_1.expect)(res.body.promo.value).toBe(5);
        (0, vitest_1.expect)(res.body.promo.amount).toBe(5);
        const cart = yield cart_model_1.default.findOne({ user: customer.user.id });
        (0, vitest_1.expect)(cart === null || cart === void 0 ? void 0 : cart.discount).toBe(5);
        (0, vitest_1.expect)(String(cart === null || cart === void 0 ? void 0 : cart.promoCode)).toBe(getId(promo));
    }));
    (0, vitest_1.it)("rejects missing promo code", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct();
        yield addProductToCart(customer.accessToken, getId(product), 1);
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/cart/apply-promo")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({});
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.message).toBe("Promo code is required.");
    }));
    (0, vitest_1.it)("rejects inactive promo code", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct();
        yield createPromo({
            code: "INACTIVE10",
            discountType: "percentage",
            discountValue: 10,
            isActive: false,
        });
        yield addProductToCart(customer.accessToken, getId(product), 1);
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/cart/apply-promo")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            code: "INACTIVE10",
        });
        (0, vitest_1.expect)(res.status).toBe(404);
        (0, vitest_1.expect)(res.body.message).toBe("Promo code not found or inactive.");
    }));
    (0, vitest_1.it)("rejects expired promo code", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct();
        yield createPromo({
            code: "EXPIRED10",
            discountType: "percentage",
            discountValue: 10,
            expiresAt: pastDate(1),
            isActive: true,
        });
        yield addProductToCart(customer.accessToken, getId(product), 1);
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/cart/apply-promo")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            code: "EXPIRED10",
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.message).toBe("Promo code has expired.");
    }));
    (0, vitest_1.it)("removes promo code", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct({ price: 100 });
        yield createPromo({
            code: "REMOVE10",
            discountType: "percentage",
            discountValue: 10,
        });
        yield addProductToCart(customer.accessToken, getId(product), 1);
        const apply = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/cart/apply-promo")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            code: "REMOVE10",
        });
        (0, vitest_1.expect)(apply.status).toBe(200);
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/cart/remove-promocode")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({});
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.summary.discount).toBe(0);
        (0, vitest_1.expect)(res.body.summary.promoCode).toBeNull();
        (0, vitest_1.expect)(res.body.summary.promo).toBeNull();
        (0, vitest_1.expect)(res.body.promoCode).toBeNull();
        const cart = yield cart_model_1.default.findOne({ user: customer.user.id });
        (0, vitest_1.expect)(cart === null || cart === void 0 ? void 0 : cart.discount).toBe(0);
        (0, vitest_1.expect)(cart === null || cart === void 0 ? void 0 : cart.promoCode).toBeNull();
    }));
    (0, vitest_1.it)("selects valid delivery method", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct({ price: 100 });
        yield createDeliverySetting({
            method: "express",
            baseFee: 5,
            estimatedDays: 1,
            isActive: true,
        });
        yield addProductToCart(customer.accessToken, getId(product), 1);
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/cart/select-delivery")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            method: "express",
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.delivery.method).toBe("express");
        (0, vitest_1.expect)(res.body.delivery.baseFee).toBe(5);
        (0, vitest_1.expect)(res.body.delivery.estimatedDays).toBe(1);
        (0, vitest_1.expect)(res.body.summary.deliveryFee).toBe(5);
        const cart = yield cart_model_1.default.findOne({ user: customer.user.id });
        (0, vitest_1.expect)(cart === null || cart === void 0 ? void 0 : cart.delivery).toBeTruthy();
    }));
    (0, vitest_1.it)("rejects missing delivery method", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct();
        yield addProductToCart(customer.accessToken, getId(product), 1);
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/cart/select-delivery")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({});
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.message).toBe("Delivery method is required.");
    }));
    (0, vitest_1.it)("rejects inactive or missing delivery method", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct();
        yield createDeliverySetting({
            method: "inactive-delivery",
            baseFee: 3,
            estimatedDays: 4,
            isActive: false,
        });
        yield addProductToCart(customer.accessToken, getId(product), 1);
        const inactive = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/cart/select-delivery")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            method: "inactive-delivery",
        });
        (0, vitest_1.expect)(inactive.status).toBe(404);
        (0, vitest_1.expect)(inactive.body.message).toBe("Delivery method not found.");
        const missing = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/cart/select-delivery")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            method: "missing-delivery",
        });
        (0, vitest_1.expect)(missing.status).toBe(404);
        (0, vitest_1.expect)(missing.body.message).toBe("Delivery method not found.");
    }));
    (0, vitest_1.it)("cart summary recalculates after promo and delivery", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct({ price: 100 });
        yield createPromo({
            code: "SUMMARY10",
            discountType: "percentage",
            discountValue: 10,
        });
        yield createDeliverySetting({
            method: "express-summary",
            baseFee: 5,
            estimatedDays: 1,
            isActive: true,
        });
        yield addProductToCart(customer.accessToken, getId(product), 2);
        const applyPromo = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/cart/apply-promo")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            code: "SUMMARY10",
        });
        (0, vitest_1.expect)(applyPromo.status).toBe(200);
        const selectDelivery = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/cart/select-delivery")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            method: "express-summary",
        });
        (0, vitest_1.expect)(selectDelivery.status).toBe(200);
        const cart = yield (0, supertest_1.default)(app_1.default)
            .get("/api/v1/cart")
            .set("Authorization", `Bearer ${customer.accessToken}`);
        (0, vitest_1.expect)(cart.status).toBe(200);
        // subTotal = 100 * 2 = 200
        // discount = 10% of 200 = 20
        // serviceTax = 10% of subtotal = 20
        // deliveryFee = 5
        // total = 200 - 20 + 20 + 5 = 205
        (0, vitest_1.expect)(cart.body.summary.subTotal).toBe(200);
        (0, vitest_1.expect)(cart.body.summary.discount).toBe(20);
        (0, vitest_1.expect)(cart.body.summary.serviceTax).toBe(20);
        (0, vitest_1.expect)(cart.body.summary.deliveryFee).toBe(5);
        (0, vitest_1.expect)(cart.body.summary.total).toBe(205);
        (0, vitest_1.expect)(cart.body.summary.promoCode).toBe("SUMMARY10");
        (0, vitest_1.expect)(cart.body.summary.promo.amount).toBe(20);
        (0, vitest_1.expect)(cart.body.delivery.method).toBe("express-summary");
    }));
});
