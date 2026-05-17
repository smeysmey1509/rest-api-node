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
const mongoose_1 = require("mongoose");
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const mongoose_2 = __importDefault(require("mongoose"));
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
const order_model_1 = __importDefault(require("../../orders/order.model"));
const payment_model_1 = __importDefault(require("../payment.model"));
let mongo;
const getId = (doc) => String(doc._id);
const uniqueEmail = (prefix) => `${prefix}-${(0, crypto_1.randomUUID)()}@example.com`;
const uniqueName = (prefix) => `${prefix}-${(0, crypto_1.randomUUID)().slice(0, 8)}`;
const registerAndGetToken = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (role = "CUSTOMER") {
    const email = uniqueEmail(role.toLowerCase());
    const password = "Password123";
    const register = yield (0, supertest_1.default)(app_1.default).post("/api/v1/register").send({
        name: `${role} User`,
        email,
        password,
    });
    (0, vitest_1.expect)(register.status).toBe(201);
    if (role !== "CUSTOMER") {
        yield user_model_1.default.findOneAndUpdate({ email }, { role });
    }
    const login = yield (0, supertest_1.default)(app_1.default).post("/api/v1/login").send({
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
    var _a, _b;
    const category = yield createCategory();
    const seller = yield user_model_1.default.create({
        name: uniqueName("Seller"),
        email: uniqueEmail("seller"),
        password: "Password123",
        role: "ADMIN",
        status: "ACTIVE",
    });
    return product_model_1.default.create({
        name: uniqueName("PaymentProduct"),
        category: getId(category),
        seller: getId(seller),
        price: (_a = overrides.price) !== null && _a !== void 0 ? _a : 100,
        stock: (_b = overrides.stock) !== null && _b !== void 0 ? _b : 10,
        status: "Published",
        images: [],
        tag: [],
        description: "Payment test product",
        dedupeKey: (0, crypto_1.randomUUID)(),
    });
});
const createOrderAndPayment = (userId_1, product_1, ...args_1) => __awaiter(void 0, [userId_1, product_1, ...args_1], void 0, function* (userId, product, quantity = 2) {
    const amount = Number(product.price) * quantity;
    const order = yield order_model_1.default.create({
        user: userId,
        items: [
            {
                product: getId(product),
                name: product.name,
                slug: product.slug,
                price: product.price,
                quantity,
            },
        ],
        subTotal: amount,
        discount: 0,
        deliveryFee: 0,
        serviceTax: 0,
        total: amount,
        status: "PENDING_PAYMENT",
        statusHistory: [
            {
                status: "PENDING_PAYMENT",
                message: "Order created for payment test.",
                updatedAt: new Date(),
            },
        ],
        payment: {
            method: "NORMAL_PAYMENT",
            status: "PENDING",
            currency: "USD",
            paidAt: null,
        },
        summary: {
            subTotal: amount,
            discount: 0,
            deliveryFee: 0,
            serviceTax: 0,
            total: amount,
            taxRate: 0,
            promoCode: null,
            promo: null,
        },
    });
    const payment = yield payment_model_1.default.create({
        order: getId(order),
        user: userId,
        method: "NORMAL_PAYMENT",
        provider: "NORMAL_PAYMENT",
        status: "PENDING",
        amount,
        currency: "USD",
        transactionId: `txn-${(0, crypto_1.randomUUID)()}`,
        merchantRef: getId(order),
    });
    return { order, payment };
});
(0, vitest_1.beforeAll)(() => __awaiter(void 0, void 0, void 0, function* () {
    mongo = yield mongodb_memory_server_1.MongoMemoryReplSet.create({
        replSet: {
            count: 1,
            storageEngine: "wiredTiger",
        },
    });
    if (mongoose_2.default.connection.readyState !== 0) {
        yield mongoose_2.default.disconnect();
    }
    yield mongoose_2.default.connect(mongo.getUri());
}));
(0, vitest_1.afterEach)(() => __awaiter(void 0, void 0, void 0, function* () {
    yield payment_model_1.default.deleteMany({});
    yield order_model_1.default.deleteMany({});
    yield product_model_1.default.deleteMany({}).setOptions({ withDeleted: true });
    yield category_model_1.default.deleteMany({});
    yield user_model_1.default.deleteMany({});
}));
(0, vitest_1.afterAll)(() => __awaiter(void 0, void 0, void 0, function* () {
    yield mongoose_2.default.disconnect();
    yield mongo.stop();
}));
(0, vitest_1.describe)("Payments API", () => {
    (0, vitest_1.it)("rejects get payment without token", () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default).get(`/api/v1/payments/${new mongoose_1.Types.ObjectId()}`);
        (0, vitest_1.expect)(res.status).toBe(401);
        (0, vitest_1.expect)(res.body.message).toBe("Authentication required");
    }));
    (0, vitest_1.it)("authenticated user can get payment", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct();
        const { payment } = yield createOrderAndPayment(customer.user.id, product);
        const res = yield (0, supertest_1.default)(app_1.default)
            .get(`/api/v1/payments/${getId(payment)}`)
            .set("Authorization", `Bearer ${customer.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body._id).toBe(getId(payment));
        (0, vitest_1.expect)(res.body.user).toBe(customer.user.id);
        (0, vitest_1.expect)(res.body.status).toBe("PENDING");
    }));
    (0, vitest_1.it)("missing payment returns 404", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const missingPaymentId = new mongoose_1.Types.ObjectId().toString();
        const res = yield (0, supertest_1.default)(app_1.default)
            .get(`/api/v1/payments/${missingPaymentId}`)
            .set("Authorization", `Bearer ${customer.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(404);
        (0, vitest_1.expect)(res.body.message).toBe("Payment not found");
    }));
    (0, vitest_1.it)("verify normal payment keeps payment pending", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct();
        const { payment } = yield createOrderAndPayment(customer.user.id, product);
        const res = yield (0, supertest_1.default)(app_1.default)
            .post(`/api/v1/payments/${getId(payment)}/verify`)
            .set("Authorization", `Bearer ${customer.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.status).toBe("PENDING");
        (0, vitest_1.expect)(res.body.gatewayStatus).toBe("PENDING");
    }));
    (0, vitest_1.it)("customer cannot confirm manual payment", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct();
        const { payment } = yield createOrderAndPayment(customer.user.id, product);
        const res = yield (0, supertest_1.default)(app_1.default)
            .post(`/api/v1/payments/${getId(payment)}/confirm-manual`)
            .set("Authorization", `Bearer ${customer.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(403);
        (0, vitest_1.expect)(res.body.msg).toBe("Forbidden: insufficient role");
    }));
    (0, vitest_1.it)("admin can confirm manual payment", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const admin = yield registerAndGetToken("ADMIN");
        const product = yield createProduct({ stock: 10 });
        const { payment } = yield createOrderAndPayment(customer.user.id, product, 2);
        const res = yield (0, supertest_1.default)(app_1.default)
            .post(`/api/v1/payments/${getId(payment)}/confirm-manual`)
            .set("Authorization", `Bearer ${admin.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.status).toBe("SUCCESS");
        (0, vitest_1.expect)(res.body.gatewayStatus).toBe("APPROVED");
        (0, vitest_1.expect)(res.body.verifiedAt).toBeTruthy();
        (0, vitest_1.expect)(res.body.paidAt).toBeTruthy();
    }));
    (0, vitest_1.it)("manual confirmation marks order PAID and reduces stock", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const admin = yield registerAndGetToken("ADMIN");
        const product = yield createProduct({ stock: 10 });
        const { order, payment } = yield createOrderAndPayment(customer.user.id, product, 3);
        const res = yield (0, supertest_1.default)(app_1.default)
            .post(`/api/v1/payments/${getId(payment)}/confirm-manual`)
            .set("Authorization", `Bearer ${admin.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        const dbOrder = yield order_model_1.default.findById(getId(order));
        (0, vitest_1.expect)(dbOrder === null || dbOrder === void 0 ? void 0 : dbOrder.status).toBe("PAID");
        (0, vitest_1.expect)(dbOrder === null || dbOrder === void 0 ? void 0 : dbOrder.payment.status).toBe("SUCCESS");
        const dbProduct = yield product_model_1.default.findById(getId(product));
        (0, vitest_1.expect)(dbProduct === null || dbProduct === void 0 ? void 0 : dbProduct.stock).toBe(7);
        (0, vitest_1.expect)(dbProduct === null || dbProduct === void 0 ? void 0 : dbProduct.salesCount).toBe(3);
    }));
    (0, vitest_1.it)("confirming twice does not reduce stock twice", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const admin = yield registerAndGetToken("ADMIN");
        const product = yield createProduct({ stock: 10 });
        const { payment } = yield createOrderAndPayment(customer.user.id, product, 2);
        const first = yield (0, supertest_1.default)(app_1.default)
            .post(`/api/v1/payments/${getId(payment)}/confirm-manual`)
            .set("Authorization", `Bearer ${admin.accessToken}`);
        (0, vitest_1.expect)(first.status).toBe(200);
        const second = yield (0, supertest_1.default)(app_1.default)
            .post(`/api/v1/payments/${getId(payment)}/confirm-manual`)
            .set("Authorization", `Bearer ${admin.accessToken}`);
        (0, vitest_1.expect)(second.status).toBe(200);
        const dbProduct = yield product_model_1.default.findById(getId(product));
        (0, vitest_1.expect)(dbProduct === null || dbProduct === void 0 ? void 0 : dbProduct.stock).toBe(8);
        (0, vitest_1.expect)(dbProduct === null || dbProduct === void 0 ? void 0 : dbProduct.salesCount).toBe(2);
    }));
    (0, vitest_1.it)("confirm missing payment returns 404", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const missingPaymentId = new mongoose_1.Types.ObjectId().toString();
        const res = yield (0, supertest_1.default)(app_1.default)
            .post(`/api/v1/payments/${missingPaymentId}/confirm-manual`)
            .set("Authorization", `Bearer ${admin.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(404);
        (0, vitest_1.expect)(res.body.message).toBe("Payment not found");
    }));
});
