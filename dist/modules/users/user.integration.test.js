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
const app_1 = __importDefault(require("../../app"));
const user_model_1 = __importDefault(require("../../modules/users/user.model"));
let mongo;
const uniqueEmail = (prefix) => {
    return `${prefix}-${(0, crypto_1.randomUUID)()}@example.com`;
};
const registerAndGetToken = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (role = "CUSTOMER", overrides = {}) {
    const password = overrides.password || "Password123";
    const email = overrides.email || uniqueEmail(role.toLowerCase());
    const register = yield (0, supertest_1.default)(app_1.default)
        .post("/api/v1/register")
        .send({
        name: overrides.name || `${role} User`,
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
        password,
    };
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
}));
(0, vitest_1.afterAll)(() => __awaiter(void 0, void 0, void 0, function* () {
    yield mongoose_2.default.disconnect();
    yield mongo.stop();
}));
(0, vitest_1.describe)("Users API", () => {
    (0, vitest_1.it)("rejects /me without access token", () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default).get("/api/v1/me");
        (0, vitest_1.expect)(res.status).toBe(401);
        (0, vitest_1.expect)(res.body.message).toBe("Authentication required");
    }));
    (0, vitest_1.it)("gets current user profile with valid token", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER", {
            name: "Profile User",
            email: uniqueEmail("profile"),
        });
        const res = yield (0, supertest_1.default)(app_1.default)
            .get("/api/v1/me")
            .set("Authorization", `Bearer ${customer.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.email).toBe(customer.email);
        (0, vitest_1.expect)(res.body.name).toBe("Profile User");
        (0, vitest_1.expect)(res.body.role).toBe("CUSTOMER");
        (0, vitest_1.expect)(res.body.password).toBeUndefined();
    }));
    (0, vitest_1.it)("supports legacy /profile route", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const res = yield (0, supertest_1.default)(app_1.default)
            .get("/api/v1/profile")
            .set("Authorization", `Bearer ${customer.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.msg).toBe("Welcome to the protected route!");
        (0, vitest_1.expect)(res.body.user.email).toBe(customer.email);
        (0, vitest_1.expect)(res.body.user.password).toBeUndefined();
    }));
    (0, vitest_1.it)("updates current user profile allowed fields only", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER", {
            email: uniqueEmail("update-profile"),
        });
        const res = yield (0, supertest_1.default)(app_1.default)
            .patch("/api/v1/me")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            name: "Updated Name",
            limit: 25,
            role: "ADMIN",
            status: "BLOCKED",
            password: "HackedPassword123",
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.name).toBe("Updated Name");
        (0, vitest_1.expect)(res.body.limit).toBe(25);
        (0, vitest_1.expect)(res.body.role).toBe("CUSTOMER");
        (0, vitest_1.expect)(res.body.status).toBe("ACTIVE");
        (0, vitest_1.expect)(res.body.password).toBeUndefined();
        const dbUser = yield user_model_1.default.findOne({ email: customer.email }).select("+password");
        (0, vitest_1.expect)(dbUser === null || dbUser === void 0 ? void 0 : dbUser.role).toBe("CUSTOMER");
        (0, vitest_1.expect)(dbUser === null || dbUser === void 0 ? void 0 : dbUser.status).toBe("ACTIVE");
        (0, vitest_1.expect)(dbUser === null || dbUser === void 0 ? void 0 : dbUser.password).not.toBe("HackedPassword123");
    }));
    (0, vitest_1.it)("rejects users list for customer role", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const res = yield (0, supertest_1.default)(app_1.default)
            .get("/api/v1/users")
            .set("Authorization", `Bearer ${customer.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(403);
        (0, vitest_1.expect)(res.body.msg).toBe("Forbidden: insufficient role");
    }));
    (0, vitest_1.it)("allows admin to list users", () => __awaiter(void 0, void 0, void 0, function* () {
        yield registerAndGetToken("CUSTOMER", {
            email: uniqueEmail("customer-list"),
        });
        const admin = yield registerAndGetToken("ADMIN", {
            email: uniqueEmail("admin-list"),
        });
        const res = yield (0, supertest_1.default)(app_1.default)
            .get("/api/v1/users")
            .set("Authorization", `Bearer ${admin.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(Array.isArray(res.body)).toBe(true);
        (0, vitest_1.expect)(res.body.length).toBeGreaterThanOrEqual(2);
        for (const user of res.body) {
            (0, vitest_1.expect)(user.password).toBeUndefined();
        }
    }));
    (0, vitest_1.it)("allows admin to get user by id", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER", {
            email: uniqueEmail("get-user"),
        });
        const admin = yield registerAndGetToken("ADMIN", {
            email: uniqueEmail("admin-get-user"),
        });
        const res = yield (0, supertest_1.default)(app_1.default)
            .get(`/api/v1/users/${customer.user.id}`)
            .set("Authorization", `Bearer ${admin.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.email).toBe(customer.email);
        (0, vitest_1.expect)(res.body.password).toBeUndefined();
    }));
    (0, vitest_1.it)("returns 404 when admin gets missing user", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const missingUserId = new mongoose_1.Types.ObjectId().toString();
        const res = yield (0, supertest_1.default)(app_1.default)
            .get(`/api/v1/users/${missingUserId}`)
            .set("Authorization", `Bearer ${admin.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(404);
        (0, vitest_1.expect)(res.body.message).toBe("User not found.");
    }));
    (0, vitest_1.it)("rejects status update for customer role", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const target = yield registerAndGetToken("CUSTOMER", {
            email: uniqueEmail("target-status"),
        });
        const res = yield (0, supertest_1.default)(app_1.default)
            .patch(`/api/v1/users/${target.user.id}/status`)
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            status: "BLOCKED",
        });
        (0, vitest_1.expect)(res.status).toBe(403);
        (0, vitest_1.expect)(res.body.msg).toBe("Forbidden: insufficient role");
    }));
    (0, vitest_1.it)("allows admin to update user status to BLOCKED", () => __awaiter(void 0, void 0, void 0, function* () {
        const target = yield registerAndGetToken("CUSTOMER", {
            email: uniqueEmail("blocked-target"),
        });
        const admin = yield registerAndGetToken("ADMIN", {
            email: uniqueEmail("admin-block"),
        });
        const res = yield (0, supertest_1.default)(app_1.default)
            .patch(`/api/v1/users/${target.user.id}/status`)
            .set("Authorization", `Bearer ${admin.accessToken}`)
            .send({
            status: "BLOCKED",
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.status).toBe("BLOCKED");
        const dbUser = yield user_model_1.default.findById(target.user.id);
        (0, vitest_1.expect)(dbUser === null || dbUser === void 0 ? void 0 : dbUser.status).toBe("BLOCKED");
    }));
    (0, vitest_1.it)("rejects missing status when updating user status", () => __awaiter(void 0, void 0, void 0, function* () {
        const target = yield registerAndGetToken("CUSTOMER");
        const admin = yield registerAndGetToken("ADMIN");
        const res = yield (0, supertest_1.default)(app_1.default)
            .patch(`/api/v1/users/${target.user.id}/status`)
            .set("Authorization", `Bearer ${admin.accessToken}`)
            .send({});
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.code).toBe("VALIDATION_ERROR");
    }));
    (0, vitest_1.it)("rejects invalid user status", () => __awaiter(void 0, void 0, void 0, function* () {
        const target = yield registerAndGetToken("CUSTOMER");
        const admin = yield registerAndGetToken("ADMIN");
        const res = yield (0, supertest_1.default)(app_1.default)
            .patch(`/api/v1/users/${target.user.id}/status`)
            .set("Authorization", `Bearer ${admin.accessToken}`)
            .send({
            status: "DELETED",
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.message).toBe("Invalid user status");
    }));
    (0, vitest_1.it)("allows admin to set user status back to ACTIVE", () => __awaiter(void 0, void 0, void 0, function* () {
        const target = yield registerAndGetToken("CUSTOMER");
        const admin = yield registerAndGetToken("ADMIN");
        yield user_model_1.default.findByIdAndUpdate(target.user.id, {
            status: "BLOCKED",
        });
        const res = yield (0, supertest_1.default)(app_1.default)
            .patch(`/api/v1/users/${target.user.id}/status`)
            .set("Authorization", `Bearer ${admin.accessToken}`)
            .send({
            status: "ACTIVE",
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.status).toBe("ACTIVE");
    }));
});
