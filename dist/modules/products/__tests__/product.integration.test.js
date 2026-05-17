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
const product_model_1 = __importDefault(require("../product.model"));
let mongo;
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
const getId = (doc) => String(doc._id);
const createProductAsAdmin = (adminToken_1, categoryId_1, ...args_1) => __awaiter(void 0, [adminToken_1, categoryId_1, ...args_1], void 0, function* (adminToken, categoryId, overrides = {}) {
    var _a, _b, _c, _d, _e, _f;
    const name = overrides.name || uniqueName("Product");
    const res = yield (0, supertest_1.default)(app_1.default)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
        name,
        category: categoryId,
        price: (_a = overrides.price) !== null && _a !== void 0 ? _a : 99,
        stock: (_b = overrides.stock) !== null && _b !== void 0 ? _b : 10,
        status: (_c = overrides.status) !== null && _c !== void 0 ? _c : "Published",
        description: (_d = overrides.description) !== null && _d !== void 0 ? _d : "Test product description",
        images: (_e = overrides.images) !== null && _e !== void 0 ? _e : [],
        tag: (_f = overrides.tag) !== null && _f !== void 0 ? _f : [],
    });
    (0, vitest_1.expect)(res.status).toBe(201);
    return res.body;
});
(0, vitest_1.beforeAll)(() => __awaiter(void 0, void 0, void 0, function* () {
    mongo = yield mongodb_memory_server_1.MongoMemoryServer.create();
    if (mongoose_2.default.connection.readyState !== 0) {
        yield mongoose_2.default.disconnect();
    }
    yield mongoose_2.default.connect(mongo.getUri());
}));
(0, vitest_1.afterEach)(() => __awaiter(void 0, void 0, void 0, function* () {
    yield product_model_1.default.deleteMany({}).setOptions({ withDeleted: true });
    yield category_model_1.default.deleteMany({});
    yield user_model_1.default.deleteMany({});
}));
(0, vitest_1.afterAll)(() => __awaiter(void 0, void 0, void 0, function* () {
    yield mongoose_2.default.disconnect();
    yield mongo.stop();
}));
(0, vitest_1.describe)("Products API", () => {
    (0, vitest_1.it)("public can list products", () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default).get("/api/v1/products");
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(Array.isArray(res.body.products)).toBe(true);
        (0, vitest_1.expect)(res.body.total).toBe(0);
        (0, vitest_1.expect)(res.body.page).toBe(1);
        (0, vitest_1.expect)(res.body.perPage).toBe(25);
    }));
    (0, vitest_1.it)("admin can create product", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const category = yield createCategory();
        const productName = uniqueName("iPhone");
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/products")
            .set("Authorization", `Bearer ${admin.accessToken}`)
            .send({
            name: productName,
            category: getId(category),
            price: 1200,
            stock: 5,
            description: "Apple phone",
        });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.name).toBe(productName);
        (0, vitest_1.expect)(res.body.price).toBe(1200);
        (0, vitest_1.expect)(res.body.stock).toBe(5);
        (0, vitest_1.expect)(res.body.status).toBe("Published");
        (0, vitest_1.expect)(res.body.category.toString()).toBe(getId(category));
    }));
    (0, vitest_1.it)("customer cannot create product", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const category = yield createCategory();
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/products")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            name: uniqueName("Customer Product"),
            category: getId(category),
            price: 10,
            stock: 1,
        });
        (0, vitest_1.expect)(res.status).toBe(403);
        (0, vitest_1.expect)(res.body.msg).toBe("Forbidden: insufficient role");
    }));
    (0, vitest_1.it)("rejects create product without name", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const category = yield createCategory();
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/products")
            .set("Authorization", `Bearer ${admin.accessToken}`)
            .send({
            category: getId(category),
            price: 10,
            stock: 1,
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.code).toBe("VALIDATION_ERROR");
    }));
    (0, vitest_1.it)("rejects create product without category", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/products")
            .set("Authorization", `Bearer ${admin.accessToken}`)
            .send({
            name: uniqueName("Missing Category"),
            price: 10,
            stock: 1,
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.code).toBe("VALIDATION_ERROR");
    }));
    (0, vitest_1.it)("public can get product by id", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const category = yield createCategory();
        const product = yield createProductAsAdmin(admin.accessToken, getId(category), {
            name: uniqueName("GetById"),
        });
        const res = yield (0, supertest_1.default)(app_1.default).get(`/api/v1/products/${product._id}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body._id).toBe(product._id);
        (0, vitest_1.expect)(res.body.name).toBe(product.name);
    }));
    (0, vitest_1.it)("public can get product by slug", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const category = yield createCategory();
        const product = yield createProductAsAdmin(admin.accessToken, getId(category), {
            name: uniqueName("GetBySlug"),
        });
        const res = yield (0, supertest_1.default)(app_1.default).get(`/api/v1/products/${product.slug}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.slug).toBe(product.slug);
        (0, vitest_1.expect)(res.body.name).toBe(product.name);
    }));
    (0, vitest_1.it)("get missing product returns 404", () => __awaiter(void 0, void 0, void 0, function* () {
        const missingId = new mongoose_1.Types.ObjectId().toString();
        const res = yield (0, supertest_1.default)(app_1.default).get(`/api/v1/products/${missingId}`);
        (0, vitest_1.expect)(res.status).toBe(404);
        (0, vitest_1.expect)(res.body.message).toBe("Product not found");
    }));
    (0, vitest_1.it)("admin can update product", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const category = yield createCategory();
        const product = yield createProductAsAdmin(admin.accessToken, getId(category), {
            name: uniqueName("BeforeUpdate"),
            price: 50,
            stock: 3,
        });
        const updatedName = uniqueName("AfterUpdate");
        const res = yield (0, supertest_1.default)(app_1.default)
            .patch(`/api/v1/products/${product._id}`)
            .set("Authorization", `Bearer ${admin.accessToken}`)
            .send({
            name: updatedName,
            price: 75,
            stock: 9,
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.name).toBe(updatedName);
        (0, vitest_1.expect)(res.body.price).toBe(75);
        (0, vitest_1.expect)(res.body.stock).toBe(9);
        (0, vitest_1.expect)(res.body.slug).toContain(updatedName.toLowerCase().split("-")[0]);
    }));
    (0, vitest_1.it)("customer cannot update product", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const customer = yield registerAndGetToken("CUSTOMER");
        const category = yield createCategory();
        const product = yield createProductAsAdmin(admin.accessToken, getId(category));
        const res = yield (0, supertest_1.default)(app_1.default)
            .patch(`/api/v1/products/${product._id}`)
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            name: "Hacked Product",
        });
        (0, vitest_1.expect)(res.status).toBe(403);
        (0, vitest_1.expect)(res.body.msg).toBe("Forbidden: insufficient role");
    }));
    (0, vitest_1.it)("admin can soft delete product", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const category = yield createCategory();
        const product = yield createProductAsAdmin(admin.accessToken, getId(category), {
            name: uniqueName("Delete"),
        });
        const res = yield (0, supertest_1.default)(app_1.default)
            .delete(`/api/v1/products/${product._id}`)
            .set("Authorization", `Bearer ${admin.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.msg).toBe("Product deleted successfully.");
        const list = yield (0, supertest_1.default)(app_1.default).get("/api/v1/products");
        (0, vitest_1.expect)(list.status).toBe(200);
        (0, vitest_1.expect)(list.body.products.find((item) => item._id === product._id)).toBeUndefined();
    }));
    (0, vitest_1.it)("customer cannot delete product", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const customer = yield registerAndGetToken("CUSTOMER");
        const category = yield createCategory();
        const product = yield createProductAsAdmin(admin.accessToken, getId(category));
        const res = yield (0, supertest_1.default)(app_1.default)
            .delete(`/api/v1/products/${product._id}`)
            .set("Authorization", `Bearer ${customer.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(403);
        (0, vitest_1.expect)(res.body.msg).toBe("Forbidden: insufficient role");
    }));
    (0, vitest_1.it)("public list hides unpublished products", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const category = yield createCategory();
        yield createProductAsAdmin(admin.accessToken, getId(category), {
            name: uniqueName("Published"),
            status: "Published",
        });
        yield createProductAsAdmin(admin.accessToken, getId(category), {
            name: uniqueName("Unpublished"),
            status: "Unpublished",
        });
        const res = yield (0, supertest_1.default)(app_1.default).get("/api/v1/products");
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.total).toBe(1);
        (0, vitest_1.expect)(res.body.products[0].status).toBe("Published");
    }));
    (0, vitest_1.it)("admin can list all statuses with status=all", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const category = yield createCategory();
        yield createProductAsAdmin(admin.accessToken, getId(category), {
            name: uniqueName("Published"),
            status: "Published",
        });
        yield createProductAsAdmin(admin.accessToken, getId(category), {
            name: uniqueName("Unpublished"),
            status: "Unpublished",
        });
        const res = yield (0, supertest_1.default)(app_1.default)
            .get("/api/v1/products?status=all")
            .set("Authorization", `Bearer ${admin.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.total).toBe(2);
    }));
    (0, vitest_1.it)("search products works", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const category = yield createCategory();
        yield createProductAsAdmin(admin.accessToken, getId(category), {
            name: "Apple Test Phone",
            description: "Searchable apple product",
        });
        yield createProductAsAdmin(admin.accessToken, getId(category), {
            name: "Kitchen Test Tool",
            description: "Kitchen item",
        });
        const res = yield (0, supertest_1.default)(app_1.default).get("/api/v1/products/search?q=Apple");
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.total).toBeGreaterThanOrEqual(1);
        (0, vitest_1.expect)(res.body.products.some((item) => item.name === "Apple Test Phone")).toBe(true);
    }));
    (0, vitest_1.it)("pagination works", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const category = yield createCategory();
        yield createProductAsAdmin(admin.accessToken, getId(category), {
            name: uniqueName("PageOne"),
        });
        yield createProductAsAdmin(admin.accessToken, getId(category), {
            name: uniqueName("PageTwo"),
        });
        const res = yield (0, supertest_1.default)(app_1.default).get("/api/v1/products?page=1&limit=1");
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.products.length).toBe(1);
        (0, vitest_1.expect)(res.body.total).toBe(2);
        (0, vitest_1.expect)(res.body.page).toBe(1);
        (0, vitest_1.expect)(res.body.perPage).toBe(1);
        (0, vitest_1.expect)(res.body.totalPages).toBe(2);
    }));
    (0, vitest_1.it)("legacy /product returns raw products array", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const category = yield createCategory();
        yield createProductAsAdmin(admin.accessToken, getId(category), {
            name: uniqueName("RawProduct"),
        });
        const res = yield (0, supertest_1.default)(app_1.default).get("/api/v1/product");
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(Array.isArray(res.body)).toBe(true);
        (0, vitest_1.expect)(res.body.length).toBe(1);
    }));
    (0, vitest_1.it)("recommendations returns related products from same category", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const category = yield createCategory();
        const product = yield createProductAsAdmin(admin.accessToken, getId(category), {
            name: uniqueName("MainRecommendation"),
        });
        const related = yield createProductAsAdmin(admin.accessToken, getId(category), {
            name: uniqueName("RelatedRecommendation"),
        });
        const res = yield (0, supertest_1.default)(app_1.default).get(`/api/v1/product/${product._id}/recommendations`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(Array.isArray(res.body.products)).toBe(true);
        (0, vitest_1.expect)(res.body.products.some((item) => item._id.toString() === related._id)).toBe(true);
        (0, vitest_1.expect)(res.body.products.some((item) => item._id.toString() === product._id)).toBe(false);
    }));
});
