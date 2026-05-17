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
const user_model_1 = __importDefault(require("../../../modules/users/user.model"));
const PromoCode_1 = __importDefault(require("../../../models/PromoCode"));
let mongo;
const uniqueEmail = (prefix) => {
    return `${prefix}-${(0, crypto_1.randomUUID)()}@example.com`;
};
const uniqueCode = (prefix) => {
    return `${prefix}-${(0, crypto_1.randomUUID)().slice(0, 8)}`;
};
const futureDate = (days = 7) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
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
const createPromo = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (overrides = {}) {
    var _a, _b, _c;
    return PromoCode_1.default.create({
        code: overrides.code || uniqueCode("PROMO").toUpperCase(),
        discountType: overrides.discountType || "percentage",
        discountValue: (_a = overrides.discountValue) !== null && _a !== void 0 ? _a : 10,
        expiresAt: overrides.expiresAt || new Date(futureDate(7)),
        isActive: (_b = overrides.isActive) !== null && _b !== void 0 ? _b : true,
        maxUsesPerUser: (_c = overrides.maxUsesPerUser) !== null && _c !== void 0 ? _c : 1,
    });
});
(0, vitest_1.beforeAll)(() => __awaiter(void 0, void 0, void 0, function* () {
    mongo = yield mongodb_memory_server_1.MongoMemoryServer.create();
    if (mongoose_1.default.connection.readyState !== 0) {
        yield mongoose_1.default.disconnect();
    }
    yield mongoose_1.default.connect(mongo.getUri());
}));
(0, vitest_1.afterEach)(() => __awaiter(void 0, void 0, void 0, function* () {
    yield PromoCode_1.default.deleteMany({});
    yield user_model_1.default.deleteMany({});
}));
(0, vitest_1.afterAll)(() => __awaiter(void 0, void 0, void 0, function* () {
    yield mongoose_1.default.disconnect();
    yield mongo.stop();
}));
(0, vitest_1.describe)("Promo Code API", () => {
    (0, vitest_1.it)("rejects promo list without token", () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default).get("/api/v1/promocode");
        (0, vitest_1.expect)(res.status).toBe(401);
    }));
    (0, vitest_1.it)("rejects promo list for CUSTOMER", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const res = yield (0, supertest_1.default)(app_1.default)
            .get("/api/v1/promocode")
            .set("Authorization", `Bearer ${customer.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(403);
        (0, vitest_1.expect)(res.body.error).toBe("Access denied, admin only.");
    }));
    (0, vitest_1.it)("ADMIN can list promo codes", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        yield createPromo({
            code: uniqueCode("LIST"),
            discountType: "percentage",
            discountValue: 15,
        });
        const res = yield (0, supertest_1.default)(app_1.default)
            .get("/api/v1/promocode")
            .set("Authorization", `Bearer ${admin.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(Array.isArray(res.body)).toBe(true);
        (0, vitest_1.expect)(res.body.length).toBe(1);
        (0, vitest_1.expect)(res.body[0].discountType).toBe("percentage");
        (0, vitest_1.expect)(res.body[0].discountValue).toBe(15);
    }));
    (0, vitest_1.it)("rejects create promo without token", () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/promocode/create")
            .send({
            code: uniqueCode("NOAUTH"),
            discountType: "percentage",
            discountValue: 10,
            expiresAt: futureDate(),
            maxUsesPerUser: 1,
        });
        (0, vitest_1.expect)(res.status).toBe(401);
    }));
    (0, vitest_1.it)("rejects create promo for CUSTOMER", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/promocode/create")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            code: uniqueCode("CUSTOMER"),
            discountType: "percentage",
            discountValue: 10,
            expiresAt: futureDate(),
            maxUsesPerUser: 1,
        });
        (0, vitest_1.expect)(res.status).toBe(403);
        (0, vitest_1.expect)(res.body.error).toBe("Access denied, admin only.");
    }));
    (0, vitest_1.it)("ADMIN can create percentage promo code", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const code = uniqueCode("PERCENT");
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/promocode/create")
            .set("Authorization", `Bearer ${admin.accessToken}`)
            .send({
            code,
            discountType: "percentage",
            discountValue: 20,
            expiresAt: futureDate(10),
            maxUsesPerUser: 2,
        });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.message).toBe("Promo code created.");
        (0, vitest_1.expect)(res.body.promo.code).toBe(code.toUpperCase());
        (0, vitest_1.expect)(res.body.promo.discountType).toBe("percentage");
        (0, vitest_1.expect)(res.body.promo.discountValue).toBe(20);
        (0, vitest_1.expect)(res.body.promo.maxUsesPerUser).toBe(2);
        (0, vitest_1.expect)(res.body.promo.isActive).toBe(true);
        const dbPromo = yield PromoCode_1.default.findOne({ code: code.toUpperCase() });
        (0, vitest_1.expect)(dbPromo).toBeTruthy();
    }));
    (0, vitest_1.it)("ADMIN can create fixed promo code", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const code = uniqueCode("FIXED");
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/promocode/create")
            .set("Authorization", `Bearer ${admin.accessToken}`)
            .send({
            code,
            discountType: "fixed",
            discountValue: 5,
            expiresAt: futureDate(10),
            maxUsesPerUser: 1,
        });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.message).toBe("Promo code created.");
        (0, vitest_1.expect)(res.body.promo.code).toBe(code.toUpperCase());
        (0, vitest_1.expect)(res.body.promo.discountType).toBe("fixed");
        (0, vitest_1.expect)(res.body.promo.discountValue).toBe(5);
    }));
    (0, vitest_1.it)("promo code is saved uppercase", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const code = `lower-${(0, crypto_1.randomUUID)().slice(0, 8)}`;
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/promocode/create")
            .set("Authorization", `Bearer ${admin.accessToken}`)
            .send({
            code,
            discountType: "percentage",
            discountValue: 10,
            expiresAt: futureDate(),
            maxUsesPerUser: 1,
        });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.promo.code).toBe(code.toUpperCase());
        const dbPromo = yield PromoCode_1.default.findOne({ code: code.toUpperCase() });
        (0, vitest_1.expect)(dbPromo === null || dbPromo === void 0 ? void 0 : dbPromo.code).toBe(code.toUpperCase());
    }));
    (0, vitest_1.it)("rejects missing required fields", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/promocode/create")
            .set("Authorization", `Bearer ${admin.accessToken}`)
            .send({
            code: uniqueCode("MISSING"),
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.error).toBe("All fields are required.");
    }));
    (0, vitest_1.it)("rejects invalid discountType", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/promocode/create")
            .set("Authorization", `Bearer ${admin.accessToken}`)
            .send({
            code: uniqueCode("INVALIDTYPE"),
            discountType: "cashback",
            discountValue: 10,
            expiresAt: futureDate(),
            maxUsesPerUser: 1,
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.error).toBe("Invalid discountType.");
    }));
    (0, vitest_1.it)("rejects duplicate promo code", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const code = uniqueCode("DUPLICATE").toUpperCase();
        yield createPromo({
            code,
            discountType: "percentage",
            discountValue: 10,
        });
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/promocode/create")
            .set("Authorization", `Bearer ${admin.accessToken}`)
            .send({
            code: code.toLowerCase(),
            discountType: "percentage",
            discountValue: 20,
            expiresAt: futureDate(),
            maxUsesPerUser: 1,
        });
        (0, vitest_1.expect)(res.status).toBe(409);
        (0, vitest_1.expect)(res.body.error).toBe("Promo code already exists.");
    }));
    (0, vitest_1.it)("rejects invalid maxUsesPerUser", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/promocode/create")
            .set("Authorization", `Bearer ${admin.accessToken}`)
            .send({
            code: uniqueCode("BADMAX"),
            discountType: "percentage",
            discountValue: 10,
            expiresAt: futureDate(),
            maxUsesPerUser: 0,
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.error).toBe("maxUsesPerUser must be a positive number.");
    }));
    (0, vitest_1.it)("promo list sorts by expiresAt ascending", () => __awaiter(void 0, void 0, void 0, function* () {
        const admin = yield registerAndGetToken("ADMIN");
        const later = new Date();
        later.setDate(later.getDate() + 20);
        const sooner = new Date();
        sooner.setDate(sooner.getDate() + 5);
        yield createPromo({
            code: "LATERPROMO",
            discountType: "fixed",
            discountValue: 5,
            expiresAt: later,
        });
        yield createPromo({
            code: "SOONERPROMO",
            discountType: "percentage",
            discountValue: 10,
            expiresAt: sooner,
        });
        const res = yield (0, supertest_1.default)(app_1.default)
            .get("/api/v1/promocode")
            .set("Authorization", `Bearer ${admin.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.length).toBe(2);
        (0, vitest_1.expect)(res.body[0].code).toBe("SOONERPROMO");
        (0, vitest_1.expect)(res.body[1].code).toBe("LATERPROMO");
        const firstDate = new Date(res.body[0].expiresAt).getTime();
        const secondDate = new Date(res.body[1].expiresAt).getTime();
        (0, vitest_1.expect)(firstDate).toBeLessThan(secondDate);
    }));
});
