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
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const mongoose_1 = __importDefault(require("mongoose"));
const mongodb_memory_server_1 = require("mongodb-memory-server");
const app_1 = __importDefault(require("../../../app"));
const user_model_1 = __importDefault(require("../../users/user.model"));
let mongo;
const getSetCookieHeader = (res) => {
    const cookie = res.headers["set-cookie"];
    if (Array.isArray(cookie)) {
        return cookie.join("; ");
    }
    return cookie || "";
};
(0, vitest_1.beforeAll)(() => __awaiter(void 0, void 0, void 0, function* () {
    process.env.JWT_SECRET = "test-access-secret-minimum-32-characters";
    process.env.JWT_REFRESH_SECRET = "test-refresh-secret-minimum-32-characters";
    process.env.JWT_ACCESS_EXPIRES_IN = "15m";
    process.env.JWT_REFRESH_EXPIRES_IN = "7d";
    process.env.JWT_ISSUER = "rest-api-node";
    process.env.JWT_AUDIENCE = "rest-api-node-client";
    mongo = yield mongodb_memory_server_1.MongoMemoryServer.create();
    if (mongoose_1.default.connection.readyState !== 0) {
        yield mongoose_1.default.disconnect();
    }
    yield mongoose_1.default.connect(mongo.getUri());
}));
(0, vitest_1.afterEach)(() => __awaiter(void 0, void 0, void 0, function* () {
    yield user_model_1.default.deleteMany({});
}));
(0, vitest_1.afterAll)(() => __awaiter(void 0, void 0, void 0, function* () {
    yield mongoose_1.default.disconnect();
    yield mongo.stop();
}));
(0, vitest_1.describe)("Auth API", () => {
    (0, vitest_1.it)("allows admin user to access admin route", () => __awaiter(void 0, void 0, void 0, function* () {
        yield user_model_1.default.create({
            name: "Admin User",
            email: "admin@example.com",
            password: "Password123",
            role: "ADMIN",
            status: "ACTIVE",
        });
        const login = yield (0, supertest_1.default)(app_1.default).post("/api/v1/login").send({
            identifier: "admin@example.com",
            password: "Password123",
        });
        (0, vitest_1.expect)(login.status).toBe(200);
        (0, vitest_1.expect)(login.body.user.role).toBe("ADMIN");
        const accessToken = login.body.accessToken;
        const res = yield (0, supertest_1.default)(app_1.default)
            .get("/api/v1/admin/orders")
            .set("Authorization", `Bearer ${accessToken}`);
        (0, vitest_1.expect)(res.status).not.toBe(403);
    }));
    (0, vitest_1.it)("registers a user and sets refresh cookie", () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default).post("/api/v1/register").send({
            name: "Test User",
            email: "test@example.com",
            password: "Password123",
        });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.accessToken).toBeTruthy();
        (0, vitest_1.expect)(res.body.user.email).toBe("test@example.com");
        (0, vitest_1.expect)(getSetCookieHeader(res)).toContain("refreshToken");
    }));
    (0, vitest_1.it)("rejects weak password", () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default).post("/api/v1/register").send({
            name: "Test User",
            email: "weak@example.com",
            password: "123",
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.code).toBe("VALIDATION_ERROR");
    }));
    (0, vitest_1.it)("rejects duplicate email", () => __awaiter(void 0, void 0, void 0, function* () {
        const payload = {
            name: "Test User",
            email: "duplicate@example.com",
            password: "Password123",
        };
        yield (0, supertest_1.default)(app_1.default).post("/api/v1/register").send(payload);
        const res = yield (0, supertest_1.default)(app_1.default).post("/api/v1/register").send(payload);
        (0, vitest_1.expect)(res.status).toBe(409);
        (0, vitest_1.expect)(res.body.message).toBe("User already exists");
    }));
    (0, vitest_1.it)("logs in with valid credentials", () => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, supertest_1.default)(app_1.default).post("/api/v1/register").send({
            name: "Login User",
            email: "login@example.com",
            password: "Password123",
        });
        const res = yield (0, supertest_1.default)(app_1.default).post("/api/v1/login").send({
            identifier: "login@example.com",
            password: "Password123",
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.accessToken).toBeTruthy();
        (0, vitest_1.expect)(res.body.user.email).toBe("login@example.com");
        (0, vitest_1.expect)(getSetCookieHeader(res)).toContain("refreshToken");
    }));
    (0, vitest_1.it)("returns same message for unknown user and wrong password", () => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, supertest_1.default)(app_1.default).post("/api/v1/register").send({
            name: "Secure User",
            email: "secure@example.com",
            password: "Password123",
        });
        const wrongPassword = yield (0, supertest_1.default)(app_1.default).post("/api/v1/login").send({
            identifier: "secure@example.com",
            password: "WrongPassword123",
        });
        const unknownUser = yield (0, supertest_1.default)(app_1.default).post("/api/v1/login").send({
            identifier: "unknown@example.com",
            password: "WrongPassword123",
        });
        (0, vitest_1.expect)(wrongPassword.status).toBe(401);
        (0, vitest_1.expect)(unknownUser.status).toBe(401);
        (0, vitest_1.expect)(wrongPassword.body.message).toBe("Invalid credentials");
        (0, vitest_1.expect)(unknownUser.body.message).toBe("Invalid credentials");
    }));
    (0, vitest_1.it)("refreshes access token using refresh cookie", () => __awaiter(void 0, void 0, void 0, function* () {
        const register = yield (0, supertest_1.default)(app_1.default).post("/api/v1/register").send({
            name: "Refresh User",
            email: "refresh@example.com",
            password: "Password123",
        });
        const cookie = register.headers["set-cookie"];
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/refresh")
            .set("Cookie", cookie);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.accessToken).toBeTruthy();
        (0, vitest_1.expect)(res.body.user.email).toBe("refresh@example.com");
        (0, vitest_1.expect)(getSetCookieHeader(res)).toContain("refreshToken");
    }));
    (0, vitest_1.it)("rejects refresh without cookie", () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default).post("/api/v1/refresh");
        (0, vitest_1.expect)(res.status).toBe(401);
        (0, vitest_1.expect)(res.body.message).toBe("No refresh token provided");
    }));
    (0, vitest_1.it)("logs out and clears refresh cookie", () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default).post("/api/v1/logout");
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.msg).toBe("Logged out");
        (0, vitest_1.expect)(getSetCookieHeader(res)).toContain("refreshToken=");
    }));
    (0, vitest_1.it)("stores password as hashed value", () => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, supertest_1.default)(app_1.default).post("/api/v1/register").send({
            name: "Hash User",
            email: "hash@example.com",
            password: "Password123",
        });
        const user = yield user_model_1.default.findOne({ email: "hash@example.com" }).select("+password");
        (0, vitest_1.expect)(user).toBeTruthy();
        (0, vitest_1.expect)(user === null || user === void 0 ? void 0 : user.password).toBeTruthy();
        (0, vitest_1.expect)(user === null || user === void 0 ? void 0 : user.password).not.toBe("Password123");
        (0, vitest_1.expect)(user === null || user === void 0 ? void 0 : user.password.startsWith("$2")).toBe(true);
    }));
    (0, vitest_1.it)("sets default role to CUSTOMER", () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default).post("/api/v1/register").send({
            name: "Role User",
            email: "role@example.com",
            password: "Password123",
        });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.user.role).toBe("CUSTOMER");
    }));
    (0, vitest_1.it)("rejects invalid email", () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default).post("/api/v1/register").send({
            name: "Invalid Email",
            email: "wrong-email",
            password: "Password123",
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.code).toBe("VALIDATION_ERROR");
    }));
    (0, vitest_1.it)("rejects missing name", () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default).post("/api/v1/register").send({
            email: "noname@example.com",
            password: "Password123",
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.code).toBe("VALIDATION_ERROR");
    }));
    (0, vitest_1.it)("rejects blocked user login", () => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, supertest_1.default)(app_1.default).post("/api/v1/register").send({
            name: "Blocked User",
            email: "blocked@example.com",
            password: "Password123",
        });
        yield user_model_1.default.findOneAndUpdate({ email: "blocked@example.com" }, { status: "BLOCKED" });
        const res = yield (0, supertest_1.default)(app_1.default).post("/api/v1/login").send({
            identifier: "blocked@example.com",
            password: "Password123",
        });
        (0, vitest_1.expect)(res.status).toBe(403);
        (0, vitest_1.expect)(res.body.message).toBe("User account is not active");
    }));
    (0, vitest_1.it)("rotates refresh token cookie", () => __awaiter(void 0, void 0, void 0, function* () {
        const register = yield (0, supertest_1.default)(app_1.default).post("/api/v1/register").send({
            name: "Rotate User",
            email: "rotate@example.com",
            password: "Password123",
        });
        const firstCookie = getSetCookieHeader(register);
        const refresh = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/refresh")
            .set("Cookie", register.headers["set-cookie"]);
        const secondCookie = getSetCookieHeader(refresh);
        (0, vitest_1.expect)(refresh.status).toBe(200);
        (0, vitest_1.expect)(secondCookie).toContain("refreshToken");
        (0, vitest_1.expect)(secondCookie).not.toBe(firstCookie);
    }));
    (0, vitest_1.it)("rejects invalid refresh token", () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/refresh")
            .set("Cookie", "refreshToken=invalid-token");
        (0, vitest_1.expect)(res.status).toBe(401);
        (0, vitest_1.expect)(res.body.message).toBe("Invalid or expired refresh token");
    }));
});
