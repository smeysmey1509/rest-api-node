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
const review_model_1 = __importDefault(require("../review.model"));
const order_model_1 = __importDefault(require("../../orders/order.model"));
let mongo;
const getId = (doc) => String(doc._id);
const uniqueEmail = (prefix) => {
    return `${prefix}-${(0, crypto_1.randomUUID)()}@example.com`;
};
const uniqueName = (prefix) => {
    return `${prefix}-${(0, crypto_1.randomUUID)().slice(0, 8)}`;
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
const createPaidOrder = (userId, product) => __awaiter(void 0, void 0, void 0, function* () {
    const price = Number(product.price || 100);
    return order_model_1.default.create({
        user: userId,
        items: [
            {
                product: getId(product),
                name: product.name,
                slug: product.slug,
                price,
                quantity: 1,
            },
        ],
        subTotal: price,
        discount: 0,
        deliveryFee: 0,
        serviceTax: 0,
        total: price,
        status: "PAID",
        statusHistory: [
            {
                status: "PAID",
                message: "Paid order for review test.",
                updatedAt: new Date(),
            },
        ],
        payment: {
            method: "NORMAL_PAYMENT",
            status: "SUCCESS",
            transactionId: `txn-${(0, crypto_1.randomUUID)()}`,
            currency: "USD",
            paidAt: new Date(),
        },
        summary: {
            subTotal: price,
            discount: 0,
            deliveryFee: 0,
            serviceTax: 0,
            total: price,
            taxRate: 0,
            promoCode: null,
            promo: null,
        },
        meta: {},
    });
});
const createReviewAsCustomer = (accessToken_1, productId_1, ...args_1) => __awaiter(void 0, [accessToken_1, productId_1, ...args_1], void 0, function* (accessToken, productId, overrides = {}) {
    var _a, _b, _c;
    return (0, supertest_1.default)(app_1.default)
        .post("/api/v1/reviews")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
        productId,
        rating: (_a = overrides.rating) !== null && _a !== void 0 ? _a : 5,
        title: (_b = overrides.title) !== null && _b !== void 0 ? _b : "Great product",
        comment: (_c = overrides.comment) !== null && _c !== void 0 ? _c : "I like this product.",
        body: overrides.body,
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
    yield review_model_1.default.deleteMany({});
    yield order_model_1.default.deleteMany({});
    yield product_model_1.default.deleteMany({}).setOptions({ withDeleted: true });
    yield category_model_1.default.deleteMany({});
    yield user_model_1.default.deleteMany({});
}));
(0, vitest_1.afterAll)(() => __awaiter(void 0, void 0, void 0, function* () {
    yield mongoose_2.default.disconnect();
    yield mongo.stop();
}));
(0, vitest_1.describe)("Reviews API", () => {
    (0, vitest_1.it)("public can list approved reviews", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct();
        yield review_model_1.default.create({
            product: getId(product),
            user: customer.user.id,
            rating: 5,
            title: "Approved review",
            comment: "Visible review",
            status: "APPROVED",
            isVerifiedPurchase: true,
        });
        const res = yield (0, supertest_1.default)(app_1.default).get(`/api/v1/products/${getId(product)}/reviews`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(Array.isArray(res.body.reviews)).toBe(true);
        (0, vitest_1.expect)(res.body.reviews.length).toBe(1);
        (0, vitest_1.expect)(res.body.reviews[0].status).toBe("APPROVED");
        (0, vitest_1.expect)(res.body.reviews[0].title).toBe("Approved review");
    }));
    (0, vitest_1.it)("public legacy /product/:productId/reviews works", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct();
        yield review_model_1.default.create({
            product: getId(product),
            user: customer.user.id,
            rating: 4,
            title: "Legacy approved review",
            comment: "Visible from legacy route",
            status: "APPROVED",
            isVerifiedPurchase: true,
        });
        const res = yield (0, supertest_1.default)(app_1.default).get(`/api/v1/product/${getId(product)}/reviews`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(Array.isArray(res.body.reviews)).toBe(true);
        (0, vitest_1.expect)(res.body.reviews.length).toBe(1);
        (0, vitest_1.expect)(res.body.reviews[0].title).toBe("Legacy approved review");
    }));
    (0, vitest_1.it)("rejects create review without token", () => __awaiter(void 0, void 0, void 0, function* () {
        const product = yield createProduct();
        const res = yield (0, supertest_1.default)(app_1.default).post("/api/v1/reviews").send({
            productId: getId(product),
            rating: 5,
            comment: "No token review",
        });
        (0, vitest_1.expect)(res.status).toBe(401);
        (0, vitest_1.expect)(res.body.message).toBe("Authentication required");
    }));
    (0, vitest_1.it)("customer can create review", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct();
        yield createPaidOrder(customer.user.id, product);
        const res = yield createReviewAsCustomer(customer.accessToken, getId(product), {
            rating: 5,
            title: "Nice product",
            comment: "Very good.",
        });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.msg).toBe("Review created");
        (0, vitest_1.expect)(res.body.review.product.toString()).toBe(getId(product));
        (0, vitest_1.expect)(res.body.review.user.toString()).toBe(customer.user.id);
        (0, vitest_1.expect)(res.body.review.rating).toBe(5);
        (0, vitest_1.expect)(res.body.review.status).toBe("PENDING");
        (0, vitest_1.expect)(res.body.review.isVerifiedPurchase).toBe(true);
    }));
    (0, vitest_1.it)("rejects missing productId", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/reviews")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            rating: 5,
            comment: "Missing product id",
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.code).toBe("VALIDATION_ERROR");
    }));
    (0, vitest_1.it)("rejects missing rating", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct();
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/reviews")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            productId: getId(product),
            comment: "Missing rating",
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.code).toBe("VALIDATION_ERROR");
    }));
    (0, vitest_1.it)("rejects invalid rating", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct();
        yield createPaidOrder(customer.user.id, product);
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/reviews")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            productId: getId(product),
            rating: 6,
            comment: "Invalid rating",
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.message).toBe("rating must be between 1 and 5");
    }));
    (0, vitest_1.it)("new review is not public until approved", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct();
        yield createPaidOrder(customer.user.id, product);
        const created = yield createReviewAsCustomer(customer.accessToken, getId(product));
        (0, vitest_1.expect)(created.status).toBe(201);
        (0, vitest_1.expect)(created.body.review.status).toBe("PENDING");
        const publicList = yield (0, supertest_1.default)(app_1.default).get(`/api/v1/products/${getId(product)}/reviews`);
        (0, vitest_1.expect)(publicList.status).toBe(200);
        (0, vitest_1.expect)(publicList.body.reviews).toEqual([]);
    }));
    (0, vitest_1.it)("customer cannot approve review", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct();
        yield createPaidOrder(customer.user.id, product);
        const created = yield createReviewAsCustomer(customer.accessToken, getId(product));
        const res = yield (0, supertest_1.default)(app_1.default)
            .patch(`/api/v1/reviews/${created.body.review._id}/approve`)
            .set("Authorization", `Bearer ${customer.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(403);
        (0, vitest_1.expect)(res.body.msg).toBe("Forbidden: insufficient role");
    }));
    (0, vitest_1.it)("admin can approve review", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const admin = yield registerAndGetToken("ADMIN");
        const product = yield createProduct();
        yield createPaidOrder(customer.user.id, product);
        const created = yield createReviewAsCustomer(customer.accessToken, getId(product), {
            rating: 4,
        });
        const res = yield (0, supertest_1.default)(app_1.default)
            .patch(`/api/v1/reviews/${created.body.review._id}/approve`)
            .set("Authorization", `Bearer ${admin.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.status).toBe("APPROVED");
        const dbReview = yield review_model_1.default.findById(created.body.review._id);
        (0, vitest_1.expect)(dbReview === null || dbReview === void 0 ? void 0 : dbReview.status).toBe("APPROVED");
    }));
    (0, vitest_1.it)("approved review appears in public list", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const admin = yield registerAndGetToken("ADMIN");
        const product = yield createProduct();
        yield createPaidOrder(customer.user.id, product);
        const created = yield createReviewAsCustomer(customer.accessToken, getId(product), {
            title: "Public after approval",
            rating: 5,
        });
        yield (0, supertest_1.default)(app_1.default)
            .patch(`/api/v1/reviews/${created.body.review._id}/approve`)
            .set("Authorization", `Bearer ${admin.accessToken}`);
        const publicList = yield (0, supertest_1.default)(app_1.default).get(`/api/v1/products/${getId(product)}/reviews`);
        (0, vitest_1.expect)(publicList.status).toBe(200);
        (0, vitest_1.expect)(publicList.body.reviews.length).toBe(1);
        (0, vitest_1.expect)(publicList.body.reviews[0].title).toBe("Public after approval");
        (0, vitest_1.expect)(publicList.body.reviews[0].status).toBe("APPROVED");
    }));
    (0, vitest_1.it)("customer cannot delete review", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct();
        yield createPaidOrder(customer.user.id, product);
        const created = yield createReviewAsCustomer(customer.accessToken, getId(product));
        const res = yield (0, supertest_1.default)(app_1.default)
            .delete(`/api/v1/reviews/${created.body.review._id}`)
            .set("Authorization", `Bearer ${customer.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(403);
        (0, vitest_1.expect)(res.body.msg).toBe("Forbidden: insufficient role");
    }));
    (0, vitest_1.it)("admin can delete review", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const admin = yield registerAndGetToken("ADMIN");
        const product = yield createProduct();
        yield createPaidOrder(customer.user.id, product);
        const created = yield createReviewAsCustomer(customer.accessToken, getId(product));
        const res = yield (0, supertest_1.default)(app_1.default)
            .delete(`/api/v1/reviews/${created.body.review._id}`)
            .set("Authorization", `Bearer ${admin.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.msg).toBe("Review deleted successfully.");
        const dbReview = yield review_model_1.default.findById(created.body.review._id);
        (0, vitest_1.expect)(dbReview).toBeNull();
    }));
    (0, vitest_1.it)("delete missing review returns 404", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const missingReviewId = new mongoose_1.Types.ObjectId().toString();
        const res = yield (0, supertest_1.default)(app_1.default)
            .delete(`/api/v1/reviews/${missingReviewId}`)
            .set("Authorization", `Bearer ${admin.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(404);
        (0, vitest_1.expect)(res.body.message).toBe("Review not found");
    }));
});
