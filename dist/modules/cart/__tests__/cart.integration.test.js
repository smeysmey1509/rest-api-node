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
const cart_model_1 = __importDefault(require("../cart.model"));
let mongo;
const uniqueEmail = (prefix) => {
    return `${prefix}-${(0, crypto_1.randomUUID)()}@example.com`;
};
const uniqueName = (prefix) => {
    return `${prefix}-${(0, crypto_1.randomUUID)().slice(0, 8)}`;
};
const getId = (doc) => String(doc._id);
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
(0, vitest_1.beforeAll)(() => __awaiter(void 0, void 0, void 0, function* () {
    mongo = yield mongodb_memory_server_1.MongoMemoryServer.create();
    if (mongoose_2.default.connection.readyState !== 0) {
        yield mongoose_2.default.disconnect();
    }
    yield mongoose_2.default.connect(mongo.getUri());
}));
(0, vitest_1.afterEach)(() => __awaiter(void 0, void 0, void 0, function* () {
    yield cart_model_1.default.deleteMany({});
    yield product_model_1.default.deleteMany({}).setOptions({ withDeleted: true });
    yield category_model_1.default.deleteMany({});
    yield user_model_1.default.deleteMany({});
}));
(0, vitest_1.afterAll)(() => __awaiter(void 0, void 0, void 0, function* () {
    yield mongoose_2.default.disconnect();
    yield mongo.stop();
}));
(0, vitest_1.describe)("Cart API", () => {
    (0, vitest_1.it)("rejects /cart without token", () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default).get("/api/v1/cart");
        (0, vitest_1.expect)(res.status).toBe(401);
        (0, vitest_1.expect)(res.body.message).toBe("Authentication required");
    }));
    (0, vitest_1.it)("gets empty cart for new user", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const res = yield (0, supertest_1.default)(app_1.default)
            .get("/api/v1/cart")
            .set("Authorization", `Bearer ${customer.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.items).toEqual([]);
        (0, vitest_1.expect)(res.body.promoCode).toBeNull();
        (0, vitest_1.expect)(res.body.delivery).toBeNull();
        (0, vitest_1.expect)(res.body.summary.subTotal).toBe(0);
        (0, vitest_1.expect)(res.body.summary.discount).toBe(0);
        (0, vitest_1.expect)(res.body.summary.deliveryFee).toBe(0);
        (0, vitest_1.expect)(res.body.summary.serviceTax).toBe(0);
        (0, vitest_1.expect)(res.body.summary.total).toBe(0);
        (0, vitest_1.expect)(res.body.summary.taxRate).toBe(0);
        (0, vitest_1.expect)(res.body.summary.promoCode).toBeNull();
        (0, vitest_1.expect)(res.body.summary.promo).toBeNull();
    }));
    (0, vitest_1.it)("adds product to cart", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct({
            name: uniqueName("CartAdd"),
            price: 50,
            stock: 10,
        });
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/cart/add")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            productId: getId(product),
            quantity: 2,
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.items.length).toBe(1);
        (0, vitest_1.expect)(res.body.items[0].quantity).toBe(2);
        (0, vitest_1.expect)(res.body.summary.subTotal).toBe(100);
        (0, vitest_1.expect)(res.body.summary.total).toBeGreaterThanOrEqual(100);
    }));
    (0, vitest_1.it)("adds same product again and increases quantity", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct({
            price: 25,
        });
        yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/cart/add")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            productId: getId(product),
            quantity: 2,
        });
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/cart/add")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            productId: getId(product),
            quantity: 3,
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.items.length).toBe(1);
        (0, vitest_1.expect)(res.body.items[0].quantity).toBe(5);
        (0, vitest_1.expect)(res.body.summary.subTotal).toBe(125);
    }));
    (0, vitest_1.it)("rejects add cart without productId", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/cart/add")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            quantity: 1,
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.code).toBe("VALIDATION_ERROR");
    }));
    (0, vitest_1.it)("add missing product returns 404", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const missingProductId = new mongoose_1.Types.ObjectId().toString();
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/cart/add")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            productId: missingProductId,
            quantity: 1,
        });
        (0, vitest_1.expect)(res.status).toBe(404);
        (0, vitest_1.expect)(res.body.message).toBe("Product not found.");
    }));
    (0, vitest_1.it)("add quantity 0 defaults to 1", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct({
            price: 40,
        });
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/cart/add")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            productId: getId(product),
            quantity: 0,
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.items.length).toBe(1);
        (0, vitest_1.expect)(res.body.items[0].quantity).toBe(1);
        (0, vitest_1.expect)(res.body.summary.subTotal).toBe(40);
    }));
    (0, vitest_1.it)("updates quantity using PUT /cart/update/:productId", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct({
            price: 30,
        });
        yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/cart/add")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            productId: getId(product),
            quantity: 1,
        });
        const res = yield (0, supertest_1.default)(app_1.default)
            .put(`/api/v1/cart/update/${getId(product)}`)
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            quantity: 4,
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.items.length).toBe(1);
        (0, vitest_1.expect)(res.body.items[0].quantity).toBe(4);
        (0, vitest_1.expect)(res.body.summary.subTotal).toBe(120);
    }));
    (0, vitest_1.it)("updates quantity using PATCH /cart/:productId", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct({
            price: 15,
        });
        yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/cart/add")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            productId: getId(product),
            quantity: 1,
        });
        const res = yield (0, supertest_1.default)(app_1.default)
            .patch(`/api/v1/cart/${getId(product)}`)
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            quantity: 2,
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.items[0].quantity).toBe(2);
        (0, vitest_1.expect)(res.body.summary.subTotal).toBe(30);
    }));
    (0, vitest_1.it)("rejects update quantity less than 1", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct();
        yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/cart/add")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            productId: getId(product),
            quantity: 1,
        });
        const res = yield (0, supertest_1.default)(app_1.default)
            .put(`/api/v1/cart/update/${getId(product)}`)
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            quantity: 0,
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.message).toBe("Quantity must be at least 1.");
    }));
    (0, vitest_1.it)("update quantity for product not in cart returns 404", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct();
        yield (0, supertest_1.default)(app_1.default)
            .get("/api/v1/cart")
            .set("Authorization", `Bearer ${customer.accessToken}`);
        const res = yield (0, supertest_1.default)(app_1.default)
            .put(`/api/v1/cart/update/${getId(product)}`)
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            quantity: 2,
        });
        (0, vitest_1.expect)(res.status).toBe(404);
        (0, vitest_1.expect)(res.body.message).toBe("Cart not found.");
    }));
    (0, vitest_1.it)("removes product from cart using DELETE /cart/:productId", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct();
        yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/cart/add")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            productId: getId(product),
            quantity: 2,
        });
        const res = yield (0, supertest_1.default)(app_1.default)
            .delete(`/api/v1/cart/${getId(product)}`)
            .set("Authorization", `Bearer ${customer.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.items).toEqual([]);
        (0, vitest_1.expect)(res.body.summary.subTotal).toBe(0);
    }));
    (0, vitest_1.it)("removes product from cart using POST /cart/remove", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct();
        yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/cart/add")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            productId: getId(product),
            quantity: 2,
        });
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/cart/remove")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .field("productId", getId(product));
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.items).toEqual([]);
    }));
    (0, vitest_1.it)("remove product without existing cart returns 404", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct();
        const res = yield (0, supertest_1.default)(app_1.default)
            .delete(`/api/v1/cart/${getId(product)}`)
            .set("Authorization", `Bearer ${customer.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(404);
        (0, vitest_1.expect)(res.body.message).toBe("Cart not found.");
    }));
    (0, vitest_1.it)("clears cart using POST /cart/clear", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct();
        yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/cart/add")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            productId: getId(product),
            quantity: 2,
        });
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/cart/clear")
            .set("Authorization", `Bearer ${customer.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.msg).toBe("Cart cleared.");
        const cart = yield cart_model_1.default.findOne({ user: customer.user.id });
        (0, vitest_1.expect)(cart === null || cart === void 0 ? void 0 : cart.items.length).toBe(0);
    }));
    (0, vitest_1.it)("clears cart using DELETE /cart", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct();
        yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/cart/add")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            productId: getId(product),
            quantity: 2,
        });
        const res = yield (0, supertest_1.default)(app_1.default)
            .delete("/api/v1/cart")
            .set("Authorization", `Bearer ${customer.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.msg).toBe("Cart cleared.");
    }));
    (0, vitest_1.it)("clear cart without existing cart returns 404", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/cart/clear")
            .set("Authorization", `Bearer ${customer.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(404);
        (0, vitest_1.expect)(res.body.message).toBe("Cart not found.");
    }));
    (0, vitest_1.it)("user can only see own cart", () => __awaiter(void 0, void 0, void 0, function* () {
        const userOne = yield registerAndGetToken("CUSTOMER");
        const userTwo = yield registerAndGetToken("CUSTOMER");
        const productOne = yield createProduct({
            name: uniqueName("UserOneProduct"),
            price: 10,
        });
        const productTwo = yield createProduct({
            name: uniqueName("UserTwoProduct"),
            price: 99,
        });
        yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/cart/add")
            .set("Authorization", `Bearer ${userOne.accessToken}`)
            .send({
            productId: getId(productOne),
            quantity: 1,
        });
        yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/cart/add")
            .set("Authorization", `Bearer ${userTwo.accessToken}`)
            .send({
            productId: getId(productTwo),
            quantity: 1,
        });
        const userOneCart = yield (0, supertest_1.default)(app_1.default)
            .get("/api/v1/cart")
            .set("Authorization", `Bearer ${userOne.accessToken}`);
        const userTwoCart = yield (0, supertest_1.default)(app_1.default)
            .get("/api/v1/cart")
            .set("Authorization", `Bearer ${userTwo.accessToken}`);
        (0, vitest_1.expect)(userOneCart.status).toBe(200);
        (0, vitest_1.expect)(userTwoCart.status).toBe(200);
        (0, vitest_1.expect)(userOneCart.body.items.length).toBe(1);
        (0, vitest_1.expect)(userTwoCart.body.items.length).toBe(1);
        (0, vitest_1.expect)(userOneCart.body.items[0].product._id).toBe(getId(productOne));
        (0, vitest_1.expect)(userTwoCart.body.items[0].product._id).toBe(getId(productTwo));
        (0, vitest_1.expect)(userOneCart.body.items[0].product._id).not.toBe(userTwoCart.body.items[0].product._id);
    }));
});
