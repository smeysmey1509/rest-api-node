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
const user_model_1 = __importDefault(require("../../../modules/users/user.model"));
const DeliverySetting_1 = __importDefault(require("../../../models/DeliverySetting"));
let mongo;
const getId = (doc) => String(doc._id);
const uniqueEmail = (prefix) => {
    return `${prefix}-${(0, crypto_1.randomUUID)()}@example.com`;
};
const uniqueMethod = (prefix) => {
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
const createDeliverySetting = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (overrides = {}) {
    var _a, _b, _c, _d, _e;
    return DeliverySetting_1.default.create({
        method: overrides.method || uniqueMethod("standard"),
        baseFee: (_a = overrides.baseFee) !== null && _a !== void 0 ? _a : 2.5,
        freeThreshold: (_b = overrides.freeThreshold) !== null && _b !== void 0 ? _b : 50,
        estimatedDays: (_c = overrides.estimatedDays) !== null && _c !== void 0 ? _c : 3,
        isActive: (_d = overrides.isActive) !== null && _d !== void 0 ? _d : true,
        code: (_e = overrides.code) !== null && _e !== void 0 ? _e : null,
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
    yield DeliverySetting_1.default.deleteMany({});
    yield user_model_1.default.deleteMany({});
}));
(0, vitest_1.afterAll)(() => __awaiter(void 0, void 0, void 0, function* () {
    yield mongoose_2.default.disconnect();
    yield mongo.stop();
}));
(0, vitest_1.describe)("Delivery API", () => {
    (0, vitest_1.it)("rejects delivery list without token", () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default).get("/api/v1/delivery");
        (0, vitest_1.expect)(res.status).toBe(401);
    }));
    (0, vitest_1.it)("authenticated user can list delivery methods", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        yield createDeliverySetting({
            method: uniqueMethod("standard"),
            baseFee: 2,
            estimatedDays: 3,
        });
        const res = yield (0, supertest_1.default)(app_1.default)
            .get("/api/v1/delivery")
            .set("Authorization", `Bearer ${customer.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(Array.isArray(res.body)).toBe(true);
        (0, vitest_1.expect)(res.body.length).toBe(1);
        (0, vitest_1.expect)(res.body[0].baseFee).toBe(2);
        (0, vitest_1.expect)(res.body[0].estimatedDays).toBe(3);
    }));
    (0, vitest_1.it)("authenticated user can create delivery method", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const method = uniqueMethod("express");
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/delivery")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            method,
            baseFee: 5,
            freeThreshold: 100,
            estimatedDays: 1,
            isActive: true,
        });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.method).toBe(method);
        (0, vitest_1.expect)(res.body.baseFee).toBe(5);
        (0, vitest_1.expect)(res.body.freeThreshold).toBe(100);
        (0, vitest_1.expect)(res.body.estimatedDays).toBe(1);
        (0, vitest_1.expect)(res.body.isActive).toBe(true);
        const dbDelivery = yield DeliverySetting_1.default.findOne({ method });
        (0, vitest_1.expect)(dbDelivery).toBeTruthy();
    }));
    (0, vitest_1.it)("rejects create delivery without method", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/delivery")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            baseFee: 5,
            estimatedDays: 2,
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.error).toBe("Method, baseFee, and estimatedDays are required.");
    }));
    (0, vitest_1.it)("rejects create delivery without baseFee", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/delivery")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            method: uniqueMethod("standard"),
            estimatedDays: 2,
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.error).toBe("Method, baseFee, and estimatedDays are required.");
    }));
    (0, vitest_1.it)("rejects create delivery without estimatedDays", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/delivery")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            method: uniqueMethod("standard"),
            baseFee: 5,
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.error).toBe("Method, baseFee, and estimatedDays are required.");
    }));
    (0, vitest_1.it)("rejects duplicate delivery method", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const method = uniqueMethod("duplicate");
        yield createDeliverySetting({
            method,
            baseFee: 3,
            estimatedDays: 4,
        });
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/delivery")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            method,
            baseFee: 5,
            estimatedDays: 2,
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(res.body.error).toBe("Delivery method already exists.");
    }));
    (0, vitest_1.it)("create pickup delivery generates pickup code", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const res = yield (0, supertest_1.default)(app_1.default)
            .post("/api/v1/delivery")
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            method: "pickup",
            baseFee: 0,
            freeThreshold: 0,
            estimatedDays: 0,
            isActive: true,
        });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.method).toBe("pickup");
        (0, vitest_1.expect)(res.body.code).toBeTruthy();
        (0, vitest_1.expect)(typeof res.body.code).toBe("string");
    }));
    (0, vitest_1.it)("authenticated user can update delivery method", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const delivery = yield createDeliverySetting({
            method: uniqueMethod("old-method"),
            baseFee: 2,
            freeThreshold: 50,
            estimatedDays: 3,
            isActive: true,
        });
        const newMethod = uniqueMethod("updated-method");
        const res = yield (0, supertest_1.default)(app_1.default)
            .put(`/api/v1/delivery/edit/${getId(delivery)}`)
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            method: newMethod,
            baseFee: 7,
            freeThreshold: 120,
            isActive: false,
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.method).toBe(newMethod);
        (0, vitest_1.expect)(res.body.baseFee).toBe(7);
        (0, vitest_1.expect)(res.body.freeThreshold).toBe(120);
        (0, vitest_1.expect)(res.body.isActive).toBe(false);
        const dbDelivery = yield DeliverySetting_1.default.findById(getId(delivery));
        (0, vitest_1.expect)(dbDelivery === null || dbDelivery === void 0 ? void 0 : dbDelivery.method).toBe(newMethod);
        (0, vitest_1.expect)(dbDelivery === null || dbDelivery === void 0 ? void 0 : dbDelivery.baseFee).toBe(7);
        (0, vitest_1.expect)(dbDelivery === null || dbDelivery === void 0 ? void 0 : dbDelivery.isActive).toBe(false);
    }));
    (0, vitest_1.it)("update missing delivery method returns 404", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const missingId = new mongoose_1.Types.ObjectId().toString();
        const res = yield (0, supertest_1.default)(app_1.default)
            .put(`/api/v1/delivery/edit/${missingId}`)
            .set("Authorization", `Bearer ${customer.accessToken}`)
            .send({
            method: uniqueMethod("missing"),
            baseFee: 5,
            freeThreshold: 100,
            isActive: true,
        });
        (0, vitest_1.expect)(res.status).toBe(404);
        (0, vitest_1.expect)(res.body.error).toBe("Delivery method not found.");
    }));
    (0, vitest_1.it)("authenticated user can delete delivery method", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const delivery = yield createDeliverySetting({
            method: uniqueMethod("delete"),
            baseFee: 2,
            estimatedDays: 3,
        });
        const res = yield (0, supertest_1.default)(app_1.default)
            .delete(`/api/v1/delivery/remove/${getId(delivery)}`)
            .set("Authorization", `Bearer ${customer.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.message).toBe("Delivery method deleted.");
        const dbDelivery = yield DeliverySetting_1.default.findById(getId(delivery));
        (0, vitest_1.expect)(dbDelivery).toBeNull();
    }));
    (0, vitest_1.it)("delete missing delivery method returns 404", () => __awaiter(void 0, void 0, void 0, function* () {
        const customer = yield registerAndGetToken("CUSTOMER");
        const missingId = new mongoose_1.Types.ObjectId().toString();
        const res = yield (0, supertest_1.default)(app_1.default)
            .delete(`/api/v1/delivery/remove/${missingId}`)
            .set("Authorization", `Bearer ${customer.accessToken}`);
        (0, vitest_1.expect)(res.status).toBe(404);
        (0, vitest_1.expect)(res.body.error).toBe("Delivery method not found.");
    }));
});
