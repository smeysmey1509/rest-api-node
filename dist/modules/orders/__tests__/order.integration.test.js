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
const order_model_1 = __importDefault(require("../order.model"));
const payment_model_1 = __importDefault(require("../../payments/payment.model"));
let mongo;
const getId = (doc) => String(doc._id);
const uniqueEmail = (prefix) => `${prefix}-${(0, crypto_1.randomUUID)()}@example.com`;
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
const createOrder = (userId_1, ...args_1) => __awaiter(void 0, [userId_1, ...args_1], void 0, function* (userId, overrides = {}) {
    var _a, _b;
    const productId = overrides.productId || new mongoose_1.Types.ObjectId().toString();
    const quantity = (_a = overrides.quantity) !== null && _a !== void 0 ? _a : 1;
    const price = (_b = overrides.price) !== null && _b !== void 0 ? _b : 100;
    const total = price * quantity;
    return order_model_1.default.create({
        user: userId,
        items: [
            {
                product: productId,
                name: "Test Product",
                price,
                quantity,
            },
        ],
        subTotal: total,
        discount: 0,
        deliveryFee: 0,
        serviceTax: 0,
        total,
        status: overrides.status || "PENDING_PAYMENT",
        statusHistory: [
            {
                status: overrides.status || "PENDING_PAYMENT",
                message: "Test order created.",
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
            subTotal: total,
            discount: 0,
            deliveryFee: 0,
            serviceTax: 0,
            total,
            taxRate: 0,
            promoCode: null,
            promo: null,
        },
    });
});
const createPaymentForOrder = (order) => __awaiter(void 0, void 0, void 0, function* () {
    return payment_model_1.default.create({
        order: getId(order),
        user: String(order.user),
        method: "NORMAL_PAYMENT",
        provider: "NORMAL_PAYMENT",
        status: "PENDING",
        amount: order.total,
        currency: "USD",
        transactionId: `txn-${(0, crypto_1.randomUUID)()}`,
        merchantRef: getId(order),
    });
});
(0, vitest_1.beforeAll)(() => __awaiter(void 0, void 0, void 0, function* () {
    mongo = yield mongodb_memory_server_1.MongoMemoryServer.create();
    if (mongoose_2.default.connection.readyState !== 0) {
        yield mongoose_2.default.disconnect();
    }
    yield mongoose_2.default.connect(mongo.getUri());
}));
(0, vitest_1.afterEach)(() => __awaiter(void 0, void 0, void 0, function* () {
    yield payment_model_1.default.deleteMany({});
    yield order_model_1.default.deleteMany({});
    yield user_model_1.default.deleteMany({});
}));
(0, vitest_1.afterAll)(() => __awaiter(void 0, void 0, void 0, function* () {
    yield mongoose_2.default.disconnect();
    yield mongo.stop();
}));
(0, vitest_1.describe)("Orders API", () => {
    (0, vitest_1.it)("rejects /orders without token", () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default).get("/api/v1/orders");
        (0, vitest_1.expect)(res.status).toBe(401);
        (0, vitest_1.expect)(res.body.message).toBe("Authentication required");
    }));
    (0, vitest_1.it)("customer can list only own orders", () => __awaiter(void 0, void 0, void 0, function* () {
        const userOne = yield registerAndGetToken("CUSTOMER");
        const userTwo = yield registerAndGetToken("CUSTOMER");
        const userOneOrder = yield createOrder(userOne.user.id);
        yield createOrder(userTwo.user.id);
        const res = yield (0, supertest_1.default)(app_1.default)
            .get("/api/v1/orders")
            .set("Authorization", `Bearer ${userOne.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.orders.length).toBe(1);
        (0, vitest_1.expect)(res.body.orders[0]._id).toBe(getId(userOneOrder));
        (0, vitest_1.expect)(res.body.orders[0].user).toBe(userOne.user.id);
    }));
    (0, vitest_1.it)("customer cannot list admin orders", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const res = yield (0, supertest_1.default)(app_1.default)
            .get("/api/v1/admin/orders")
            .set("Authorization", `Bearer ${customer.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(403);
        (0, vitest_1.expect)(res.body.msg).toBe("Forbidden: insufficient role");
    }));
    (0, vitest_1.it)("admin can list all orders", () => __awaiter(void 0, void 0, void 0, function* () {
        const userOne = yield registerAndGetToken("CUSTOMER");
        const userTwo = yield registerAndGetToken("CUSTOMER");
        const admin = yield registerAndGetToken("ADMIN");
        yield createOrder(userOne.user.id);
        yield createOrder(userTwo.user.id);
        const res = yield (0, supertest_1.default)(app_1.default)
            .get("/api/v1/admin/orders")
            .set("Authorization", `Bearer ${admin.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.orders.length).toBe(2);
    }));
    (0, vitest_1.it)("customer can cancel own pending order", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const order = yield createOrder(customer.user.id, {
            status: "PENDING_PAYMENT",
        });
        const payment = yield createPaymentForOrder(order);
        const res = yield (0, supertest_1.default)(app_1.default)
            .patch(`/api/v1/orders/${getId(order)}/cancel`)
            .set("Authorization", `Bearer ${customer.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.status).toBe("CANCELLED");
        (0, vitest_1.expect)(res.body.payment.status).toBe("CANCELLED");
        const dbPayment = yield payment_model_1.default.findById(getId(payment));
        (0, vitest_1.expect)(dbPayment === null || dbPayment === void 0 ? void 0 : dbPayment.status).toBe("CANCELLED");
    }));
    (0, vitest_1.it)("customer cannot cancel another user's order", () => __awaiter(void 0, void 0, void 0, function* () {
        const userOne = yield registerAndGetToken("CUSTOMER");
        const userTwo = yield registerAndGetToken("CUSTOMER");
        const order = yield createOrder(userTwo.user.id);
        const res = yield (0, supertest_1.default)(app_1.default)
            .patch(`/api/v1/orders/${getId(order)}/cancel`)
            .set("Authorization", `Bearer ${userOne.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(403);
        (0, vitest_1.expect)(res.body.message).toBe("Forbidden");
    }));
    (0, vitest_1.it)("customer cannot cancel paid order", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const order = yield createOrder(customer.user.id, {
            status: "PAID",
        });
        const res = yield (0, supertest_1.default)(app_1.default)
            .patch(`/api/v1/orders/${getId(order)}/cancel`)
            .set("Authorization", `Bearer ${customer.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.message).toBe("Order cannot be cancelled at this stage.");
    }));
    (0, vitest_1.it)("customer cannot update order status", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const order = yield createOrder(customer.user.id);
        const res = yield (0, supertest_1.default)(app_1.default)
            .patch(`/api/v1/orders/${getId(order)}/status`)
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            status: "PROCESSING",
        });
        (0, vitest_1.expect)(res.status).toBe(403);
        (0, vitest_1.expect)(res.body.msg).toBe("Forbidden: insufficient role");
    }));
    (0, vitest_1.it)("admin can update order status", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const admin = yield registerAndGetToken("ADMIN");
        const order = yield createOrder(customer.user.id);
        const res = yield (0, supertest_1.default)(app_1.default)
            .patch(`/api/v1/admin/orders/${getId(order)}/status`)
            .set("Authorization", `Bearer ${admin.accessToken}`)
            .send({
            status: "PROCESSING",
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.status).toBe("PROCESSING");
        (0, vitest_1.expect)(res.body.statusHistory.at(-1).message).toBe("Order status updated by admin.");
    }));
    (0, vitest_1.it)("rejects update status without status", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const admin = yield registerAndGetToken("ADMIN");
        const order = yield createOrder(customer.user.id);
        const res = yield (0, supertest_1.default)(app_1.default)
            .patch(`/api/v1/admin/orders/${getId(order)}/status`)
            .set("Authorization", `Bearer ${admin.accessToken}`)
            .send({});
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.code).toBe("VALIDATION_ERROR");
    }));
    (0, vitest_1.it)("rejects marking order as PAID manually", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const admin = yield registerAndGetToken("ADMIN");
        const order = yield createOrder(customer.user.id);
        const res = yield (0, supertest_1.default)(app_1.default)
            .patch(`/api/v1/admin/orders/${getId(order)}/status`)
            .set("Authorization", `Bearer ${admin.accessToken}`)
            .send({
            status: "PAID",
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.message).toBe("Use payment confirmation to mark an order as paid.");
    }));
    (0, vitest_1.it)("missing order returns 404", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const missingOrderId = new mongoose_1.Types.ObjectId().toString();
        const res = yield (0, supertest_1.default)(app_1.default)
            .patch(`/api/v1/admin/orders/${missingOrderId}/status`)
            .set("Authorization", `Bearer ${admin.accessToken}`)
            .send({
            status: "PROCESSING",
        });
        (0, vitest_1.expect)(res.status).toBe(404);
        (0, vitest_1.expect)(res.body.message).toBe("Order not found");
    }));
});
