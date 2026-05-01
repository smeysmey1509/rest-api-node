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
const role_model_1 = __importDefault(require("../role.model"));
let mongo;
const uniqueEmail = (prefix) => {
    return `${prefix}-${(0, crypto_1.randomUUID)()}@example.com`;
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
(0, vitest_1.beforeAll)(() => __awaiter(void 0, void 0, void 0, function* () {
    mongo = yield mongodb_memory_server_1.MongoMemoryServer.create();
    if (mongoose_1.default.connection.readyState !== 0) {
        yield mongoose_1.default.disconnect();
    }
    yield mongoose_1.default.connect(mongo.getUri());
}));
(0, vitest_1.afterEach)(() => __awaiter(void 0, void 0, void 0, function* () {
    yield user_model_1.default.deleteMany({});
    yield role_model_1.default.deleteMany({});
}));
(0, vitest_1.afterAll)(() => __awaiter(void 0, void 0, void 0, function* () {
    yield mongoose_1.default.disconnect();
    yield mongo.stop();
}));
(0, vitest_1.describe)("Roles API", () => {
    (0, vitest_1.it)("rejects /roles without token", () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default).get("/api/v1/roles");
        (0, vitest_1.expect)(res.status).toBe(401);
        (0, vitest_1.expect)(res.body.message).toBe("Authentication required");
    }));
    (0, vitest_1.it)("rejects /roles with invalid token", () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default)
            .get("/api/v1/roles")
            .set("Authorization", "Bearer invalid-token");
        (0, vitest_1.expect)(res.status).toBe(401);
        (0, vitest_1.expect)(res.body.message).toBe("Invalid or expired token");
    }));
    (0, vitest_1.it)("rejects CUSTOMER access", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const res = yield (0, supertest_1.default)(app_1.default)
            .get("/api/v1/roles")
            .set("Authorization", `Bearer ${customer.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(403);
        (0, vitest_1.expect)(res.body.msg).toBe("Forbidden: insufficient role");
    }));
    (0, vitest_1.it)("rejects STAFF access", () => __awaiter(void 0, void 0, void 0, function* () {
        const staff = yield registerAndGetToken("STAFF");
        const res = yield (0, supertest_1.default)(app_1.default)
            .get("/api/v1/roles")
            .set("Authorization", `Bearer ${staff.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(403);
        (0, vitest_1.expect)(res.body.msg).toBe("Forbidden: insufficient role");
    }));
    (0, vitest_1.it)("allows ADMIN access", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const res = yield (0, supertest_1.default)(app_1.default)
            .get("/api/v1/roles")
            .set("Authorization", `Bearer ${admin.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
    }));
    (0, vitest_1.it)("response includes ADMIN, CUSTOMER, STAFF", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const res = yield (0, supertest_1.default)(app_1.default)
            .get("/api/v1/roles")
            .set("Authorization", `Bearer ${admin.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.roles).toEqual(vitest_1.expect.arrayContaining(["ADMIN", "CUSTOMER", "STAFF"]));
    }));
    (0, vitest_1.it)("response does not expose sensitive data", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const res = yield (0, supertest_1.default)(app_1.default)
            .get("/api/v1/roles")
            .set("Authorization", `Bearer ${admin.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.password).toBeUndefined();
        (0, vitest_1.expect)(res.body.accessToken).toBeUndefined();
        (0, vitest_1.expect)(res.body.refreshToken).toBeUndefined();
        for (const storedRole of res.body.stored) {
            (0, vitest_1.expect)(storedRole.password).toBeUndefined();
            (0, vitest_1.expect)(storedRole.accessToken).toBeUndefined();
            (0, vitest_1.expect)(storedRole.refreshToken).toBeUndefined();
        }
    }));
    (0, vitest_1.it)("stored roles returns array", () => __awaiter(void 0, void 0, void 0, function* () {
        yield role_model_1.default.create({
            name: "TEST_MANAGER",
            permission: ["users:read", "products:update"],
        });
        const admin = yield registerAndGetToken("ADMIN");
        const res = yield (0, supertest_1.default)(app_1.default)
            .get("/api/v1/roles")
            .set("Authorization", `Bearer ${admin.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(Array.isArray(res.body.stored)).toBe(true);
        (0, vitest_1.expect)(res.body.stored.length).toBe(1);
        (0, vitest_1.expect)(res.body.stored[0].name).toBe("TEST_MANAGER");
        (0, vitest_1.expect)(res.body.stored[0].permission).toEqual([
            "users:read",
            "products:update",
        ]);
    }));
});
