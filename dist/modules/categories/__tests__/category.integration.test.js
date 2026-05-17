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
const category_model_1 = __importDefault(require("../category.model"));
let mongo;
const uniqueEmail = (prefix) => {
    return `${prefix}-${(0, crypto_1.randomUUID)()}@example.com`;
};
const uniqueCategoryName = (prefix) => {
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
const createCategoryAsAdmin = (adminToken_1, ...args_1) => __awaiter(void 0, [adminToken_1, ...args_1], void 0, function* (adminToken, overrides = {}) {
    const categoryName = overrides.categoryName || uniqueCategoryName("Category");
    const res = yield (0, supertest_1.default)(app_1.default)
        .post("/api/v1/categories")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
        categoryName,
        categoryId: overrides.categoryId,
        description: overrides.description || "Test category",
    });
    (0, vitest_1.expect)(res.status).toBe(201);
    (0, vitest_1.expect)(res.body.category).toBeTruthy();
    return res.body.category;
});
(0, vitest_1.beforeAll)(() => __awaiter(void 0, void 0, void 0, function* () {
    mongo = yield mongodb_memory_server_1.MongoMemoryServer.create();
    if (mongoose_2.default.connection.readyState !== 0) {
        yield mongoose_2.default.disconnect();
    }
    yield mongoose_2.default.connect(mongo.getUri());
}));
(0, vitest_1.afterEach)(() => __awaiter(void 0, void 0, void 0, function* () {
    yield user_model_1.default.deleteMany({});
    yield category_model_1.default.deleteMany({});
}));
(0, vitest_1.afterAll)(() => __awaiter(void 0, void 0, void 0, function* () {
    yield mongoose_2.default.disconnect();
    yield mongo.stop();
}));
(0, vitest_1.describe)("Categories API", () => {
    (0, vitest_1.it)("public can list categories", () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default).get("/api/v1/categories");
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(Array.isArray(res.body.categories)).toBe(true);
        (0, vitest_1.expect)(res.body.total).toBe(0);
        (0, vitest_1.expect)(res.body.page).toBe(1);
        (0, vitest_1.expect)(res.body.perPage).toBe(25);
    }));
    (0, vitest_1.it)("public can list raw categories using /category", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        yield createCategoryAsAdmin(admin.accessToken, {
            categoryName: uniqueCategoryName("Raw"),
        });
        const res = yield (0, supertest_1.default)(app_1.default).get("/api/v1/category");
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(Array.isArray(res.body)).toBe(true);
        (0, vitest_1.expect)(res.body.length).toBe(1);
    }));
    (0, vitest_1.it)("admin can create category", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const categoryName = uniqueCategoryName("Phones");
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/categories")
            .set("Authorization", `Bearer ${admin.accessToken}`)
            .send({
            categoryName,
            description: "Phone products",
        });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.msg).toBe("Category created.");
        (0, vitest_1.expect)(res.body.category.categoryName).toBe(categoryName);
        (0, vitest_1.expect)(res.body.category.categoryId).toBeTruthy();
    }));
    (0, vitest_1.it)("admin can create category using legacy /category route", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const categoryName = uniqueCategoryName("Legacy");
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/category")
            .set("Authorization", `Bearer ${admin.accessToken}`)
            .send({
            name: categoryName,
            description: "Created from legacy route",
        });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.category.categoryName).toBe(categoryName);
    }));
    (0, vitest_1.it)("customer cannot create category", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/categories")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            categoryName: uniqueCategoryName("Customer"),
        });
        (0, vitest_1.expect)(res.status).toBe(403);
        (0, vitest_1.expect)(res.body.msg).toBe("Forbidden: insufficient role");
    }));
    (0, vitest_1.it)("rejects create category without categoryName or name", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/categories")
            .set("Authorization", `Bearer ${admin.accessToken}`)
            .send({
            description: "Missing category name",
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.code).toBe("VALIDATION_ERROR");
    }));
    (0, vitest_1.it)("rejects duplicate category", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const categoryName = uniqueCategoryName("Duplicate");
        yield createCategoryAsAdmin(admin.accessToken, {
            categoryName,
        });
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/categories")
            .set("Authorization", `Bearer ${admin.accessToken}`)
            .send({
            categoryName,
        });
        (0, vitest_1.expect)(res.status).toBe(409);
        (0, vitest_1.expect)(res.body.message).toBe("Duplicate category");
    }));
    (0, vitest_1.it)("public can get category by id", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const category = yield createCategoryAsAdmin(admin.accessToken, {
            categoryName: uniqueCategoryName("Get"),
        });
        const res = yield (0, supertest_1.default)(app_1.default).get(`/api/v1/categories/${category._id}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body._id).toBe(category._id);
        (0, vitest_1.expect)(res.body.categoryName).toBe(category.categoryName);
    }));
    (0, vitest_1.it)("public get missing category returns 404", () => __awaiter(void 0, void 0, void 0, function* () {
        const missingId = new mongoose_1.Types.ObjectId().toString();
        const res = yield (0, supertest_1.default)(app_1.default).get(`/api/v1/categories/${missingId}`);
        (0, vitest_1.expect)(res.status).toBe(404);
        (0, vitest_1.expect)(res.body.message).toBe("Category not found.");
    }));
    (0, vitest_1.it)("admin can update category", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const category = yield createCategoryAsAdmin(admin.accessToken, {
            categoryName: uniqueCategoryName("BeforeUpdate"),
        });
        const updatedName = uniqueCategoryName("AfterUpdate");
        const res = yield (0, supertest_1.default)(app_1.default)
            .patch(`/api/v1/categories/${category._id}`)
            .set("Authorization", `Bearer ${admin.accessToken}`)
            .send({
            categoryName: updatedName,
            description: "Updated category description",
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.categoryName).toBe(updatedName);
        (0, vitest_1.expect)(res.body.description).toBe("Updated category description");
    }));
    (0, vitest_1.it)("customer cannot update category", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const customer = yield registerAndGetToken("CUSTOMER");
        const category = yield createCategoryAsAdmin(admin.accessToken, {
            categoryName: uniqueCategoryName("CustomerUpdate"),
        });
        const res = yield (0, supertest_1.default)(app_1.default)
            .patch(`/api/v1/categories/${category._id}`)
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            categoryName: "Hacked Category",
        });
        (0, vitest_1.expect)(res.status).toBe(403);
        (0, vitest_1.expect)(res.body.msg).toBe("Forbidden: insufficient role");
    }));
    (0, vitest_1.it)("admin can delete category", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const category = yield createCategoryAsAdmin(admin.accessToken, {
            categoryName: uniqueCategoryName("Delete"),
        });
        const res = yield (0, supertest_1.default)(app_1.default)
            .delete(`/api/v1/categories/${category._id}`)
            .set("Authorization", `Bearer ${admin.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.msg).toBe("Category deleted successfully.");
        const dbCategory = yield category_model_1.default.findById(category._id);
        (0, vitest_1.expect)(dbCategory).toBeNull();
    }));
    (0, vitest_1.it)("customer cannot delete category", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const customer = yield registerAndGetToken("CUSTOMER");
        const category = yield createCategoryAsAdmin(admin.accessToken, {
            categoryName: uniqueCategoryName("CustomerDelete"),
        });
        const res = yield (0, supertest_1.default)(app_1.default)
            .delete(`/api/v1/categories/${category._id}`)
            .set("Authorization", `Bearer ${customer.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(403);
        (0, vitest_1.expect)(res.body.msg).toBe("Forbidden: insufficient role");
    }));
    (0, vitest_1.it)("delete missing category returns 404", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const missingId = new mongoose_1.Types.ObjectId().toString();
        const res = yield (0, supertest_1.default)(app_1.default)
            .delete(`/api/v1/categories/${missingId}`)
            .set("Authorization", `Bearer ${admin.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(404);
        (0, vitest_1.expect)(res.body.message).toBe("Category not found.");
    }));
    (0, vitest_1.it)("category search works with q query", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        yield createCategoryAsAdmin(admin.accessToken, {
            categoryName: "Apple Phones",
        });
        yield createCategoryAsAdmin(admin.accessToken, {
            categoryName: "Kitchen Tools",
        });
        const res = yield (0, supertest_1.default)(app_1.default).get("/api/v1/categories?q=Apple");
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.total).toBe(1);
        (0, vitest_1.expect)(res.body.categories[0].categoryName).toBe("Apple Phones");
    }));
    (0, vitest_1.it)("pagination works", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        yield createCategoryAsAdmin(admin.accessToken, {
            categoryName: uniqueCategoryName("PageOne"),
        });
        yield createCategoryAsAdmin(admin.accessToken, {
            categoryName: uniqueCategoryName("PageTwo"),
        });
        const res = yield (0, supertest_1.default)(app_1.default).get("/api/v1/categories?page=1&limit=1");
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.categories.length).toBe(1);
        (0, vitest_1.expect)(res.body.total).toBe(2);
        (0, vitest_1.expect)(res.body.page).toBe(1);
        (0, vitest_1.expect)(res.body.perPage).toBe(1);
        (0, vitest_1.expect)(res.body.totalPages).toBe(2);
    }));
});
