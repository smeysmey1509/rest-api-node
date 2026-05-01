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
const cart_model_1 = __importDefault(require("../../cart/cart.model"));
const wishlist_model_1 = __importDefault(require("../wishlist.model"));
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
(0, vitest_1.beforeAll)(() => __awaiter(void 0, void 0, void 0, function* () {
    mongo = yield mongodb_memory_server_1.MongoMemoryServer.create();
    if (mongoose_2.default.connection.readyState !== 0) {
        yield mongoose_2.default.disconnect();
    }
    yield mongoose_2.default.connect(mongo.getUri());
}));
(0, vitest_1.afterEach)(() => __awaiter(void 0, void 0, void 0, function* () {
    yield wishlist_model_1.default.deleteMany({});
    yield cart_model_1.default.deleteMany({});
    yield product_model_1.default.deleteMany({}).setOptions({ withDeleted: true });
    yield category_model_1.default.deleteMany({});
    yield user_model_1.default.deleteMany({});
}));
(0, vitest_1.afterAll)(() => __awaiter(void 0, void 0, void 0, function* () {
    yield mongoose_2.default.disconnect();
    yield mongo.stop();
}));
(0, vitest_1.describe)("Wishlist API", () => {
    (0, vitest_1.it)("rejects wishlist without token", () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default).get("/api/v1/wishlist");
        (0, vitest_1.expect)(res.status).toBe(401);
        (0, vitest_1.expect)(res.body.message).toBe("Authentication required");
    }));
    (0, vitest_1.it)("gets empty wishlist", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const res = yield (0, supertest_1.default)(app_1.default)
            .get("/api/v1/wishlist")
            .set("Authorization", `Bearer ${customer.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.items).toEqual([]);
        (0, vitest_1.expect)(res.body.totalItems).toBe(0);
        (0, vitest_1.expect)(res.body.totalPages).toBe(0);
        (0, vitest_1.expect)(res.body.currentPage).toBe(1);
    }));
    (0, vitest_1.it)("adds product to wishlist using /wishlist/:productId", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct();
        const res = yield (0, supertest_1.default)(app_1.default)
            .post(`/api/v1/wishlist/${getId(product)}`)
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({});
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.message).toBe("Product added to wishlist successfully.");
        (0, vitest_1.expect)(res.body.wishlist.items.length).toBe(1);
        (0, vitest_1.expect)(String(res.body.wishlist.items[0].product._id)).toBe(getId(product));
    }));
    (0, vitest_1.it)("adds product to wishlist using body productId", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct();
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/wishlist")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            productId: getId(product),
        });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.message).toBe("Product added to wishlist successfully.");
        (0, vitest_1.expect)(res.body.wishlist.items.length).toBe(1);
        (0, vitest_1.expect)(String(res.body.wishlist.items[0].product._id)).toBe(getId(product));
    }));
    (0, vitest_1.it)("prevents duplicate wishlist item", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct();
        yield (0, supertest_1.default)(app_1.default)
            .post(`/api/v1/wishlist/${getId(product)}`)
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({});
        const res = yield (0, supertest_1.default)(app_1.default)
            .post(`/api/v1/wishlist/${getId(product)}`)
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({});
        (0, vitest_1.expect)(res.status).toBe(409);
        (0, vitest_1.expect)(res.body.message).toBe("Product already exists in wishlist.");
        (0, vitest_1.expect)(res.body.code).toBe("DUPLICATE_WISHLIST_ITEM");
    }));
    (0, vitest_1.it)("removes product from wishlist", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct();
        yield (0, supertest_1.default)(app_1.default)
            .post(`/api/v1/wishlist/${getId(product)}`)
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({});
        const res = yield (0, supertest_1.default)(app_1.default)
            .delete(`/api/v1/wishlist/${getId(product)}`)
            .set("Authorization", `Bearer ${customer.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.message).toBe("Product removed from wishlist.");
        (0, vitest_1.expect)(res.body.wishlist.items).toEqual([]);
    }));
    (0, vitest_1.it)("remove missing wishlist product returns 404", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const savedProduct = yield createProduct();
        const missingProductId = new mongoose_1.Types.ObjectId().toString();
        yield (0, supertest_1.default)(app_1.default)
            .post(`/api/v1/wishlist/${getId(savedProduct)}`)
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({});
        const res = yield (0, supertest_1.default)(app_1.default)
            .delete(`/api/v1/wishlist/${missingProductId}`)
            .set("Authorization", `Bearer ${customer.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(404);
        (0, vitest_1.expect)(res.body.message).toBe("Product not found in wishlist.");
    }));
    (0, vitest_1.it)("user can only see own wishlist", () => __awaiter(void 0, void 0, void 0, function* () {
        const userOne = yield registerAndGetToken("CUSTOMER");
        const userTwo = yield registerAndGetToken("CUSTOMER");
        const productOne = yield createProduct({
            name: uniqueName("UserOneProduct"),
        });
        const productTwo = yield createProduct({
            name: uniqueName("UserTwoProduct"),
        });
        yield (0, supertest_1.default)(app_1.default)
            .post(`/api/v1/wishlist/${getId(productOne)}`)
            .set("Authorization", `Bearer ${userOne.accessToken}`)
            .send({});
        yield (0, supertest_1.default)(app_1.default)
            .post(`/api/v1/wishlist/${getId(productTwo)}`)
            .set("Authorization", `Bearer ${userTwo.accessToken}`)
            .send({});
        const userOneWishlist = yield (0, supertest_1.default)(app_1.default)
            .get("/api/v1/wishlist")
            .set("Authorization", `Bearer ${userOne.accessToken}`);
        const userTwoWishlist = yield (0, supertest_1.default)(app_1.default)
            .get("/api/v1/wishlist")
            .set("Authorization", `Bearer ${userTwo.accessToken}`);
        (0, vitest_1.expect)(userOneWishlist.status).toBe(200);
        (0, vitest_1.expect)(userTwoWishlist.status).toBe(200);
        (0, vitest_1.expect)(userOneWishlist.body.items.length).toBe(1);
        (0, vitest_1.expect)(userTwoWishlist.body.items.length).toBe(1);
        (0, vitest_1.expect)(String(userOneWishlist.body.items[0].product._id)).toBe(getId(productOne));
        (0, vitest_1.expect)(String(userTwoWishlist.body.items[0].product._id)).toBe(getId(productTwo));
        (0, vitest_1.expect)(String(userOneWishlist.body.items[0].product._id)).not.toBe(String(userTwoWishlist.body.items[0].product._id));
    }));
    (0, vitest_1.it)("moves wishlist item to cart", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const product = yield createProduct({
            price: 25,
        });
        yield (0, supertest_1.default)(app_1.default)
            .post(`/api/v1/wishlist/${getId(product)}`)
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({});
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/wishlist/move-to-cart")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            productId: getId(product),
            quantity: 3,
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.message).toBe("Moved product to cart.");
        (0, vitest_1.expect)(res.body.wishlist.items).toEqual([]);
        (0, vitest_1.expect)(res.body.cart.items.length).toBe(1);
        (0, vitest_1.expect)(String(res.body.cart.items[0].product._id)).toBe(getId(product));
        (0, vitest_1.expect)(res.body.cart.items[0].quantity).toBe(3);
        (0, vitest_1.expect)(res.body.cart.summary.subTotal).toBe(75);
        const wishlist = yield wishlist_model_1.default.findOne({ user: customer.user.id });
        (0, vitest_1.expect)(wishlist === null || wishlist === void 0 ? void 0 : wishlist.items.length).toBe(0);
        const cart = yield cart_model_1.default.findOne({ user: customer.user.id });
        (0, vitest_1.expect)(cart === null || cart === void 0 ? void 0 : cart.items.length).toBe(1);
    }));
    (0, vitest_1.it)("move missing wishlist item to cart returns error", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const savedProduct = yield createProduct();
        const missingProduct = yield createProduct();
        yield (0, supertest_1.default)(app_1.default)
            .post(`/api/v1/wishlist/${getId(savedProduct)}`)
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({});
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/wishlist/move-to-cart")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            productId: getId(missingProduct),
            quantity: 1,
        });
        (0, vitest_1.expect)(res.status).toBe(404);
        (0, vitest_1.expect)(res.body.message).toBe("Product not found in wishlist.");
    }));
});
