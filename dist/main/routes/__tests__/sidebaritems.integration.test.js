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
    process.env.NODE_ENV = "test";
});
const app_1 = __importDefault(require("../../../app"));
const SidebarItem_1 = __importDefault(require("../../../models/SidebarItem"));
let mongo;
const getId = (doc) => String(doc._id);
const uniqueName = (prefix) => `${prefix}-${(0, crypto_1.randomUUID)().slice(0, 8)}`;
(0, vitest_1.beforeAll)(() => __awaiter(void 0, void 0, void 0, function* () {
    mongo = yield mongodb_memory_server_1.MongoMemoryServer.create();
    if (mongoose_1.default.connection.readyState !== 0) {
        yield mongoose_1.default.disconnect();
    }
    yield mongoose_1.default.connect(mongo.getUri());
}));
(0, vitest_1.afterEach)(() => __awaiter(void 0, void 0, void 0, function* () {
    yield SidebarItem_1.default.deleteMany({});
}));
(0, vitest_1.afterAll)(() => __awaiter(void 0, void 0, void 0, function* () {
    yield mongoose_1.default.disconnect();
    yield mongo.stop();
}));
(0, vitest_1.describe)("Sidebar Items API", () => {
    (0, vitest_1.it)("public can create sidebar item", () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default).post("/api/v1/sidebar-items").send({
            name: "Dashboard",
            path: "/dashboard",
            icon: "dashboard",
            order: 1,
            type: "module",
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.item.name).toBe("Dashboard");
        (0, vitest_1.expect)(res.body.item.path).toBe("/dashboard");
        (0, vitest_1.expect)(res.body.item.type).toBe("module");
    }));
    (0, vitest_1.it)("create sidebar item requires name", () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default).post("/api/v1/sidebar-items").send({
            path: "/dashboard",
            icon: "dashboard",
            order: 1,
            type: "module",
        });
        (0, vitest_1.expect)(res.status).toBe(500);
        (0, vitest_1.expect)(res.body.message).toContain("SidebarItem validation failed");
    }));
    (0, vitest_1.it)("create sidebar item requires type", () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default).post("/api/v1/sidebar-items").send({
            name: "Dashboard",
            path: "/dashboard",
            icon: "dashboard",
            order: 1,
        });
        (0, vitest_1.expect)(res.status).toBe(500);
        (0, vitest_1.expect)(res.body.message).toContain("SidebarItem validation failed");
    }));
    (0, vitest_1.it)("rejects invalid type", () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default).post("/api/v1/sidebar-items").send({
            name: "Dashboard",
            path: "/dashboard",
            icon: "dashboard",
            order: 1,
            type: "invalid",
        });
        (0, vitest_1.expect)(res.status).toBe(500);
        (0, vitest_1.expect)(res.body.message).toContain("SidebarItem validation failed");
    }));
    (0, vitest_1.it)("public can get empty sidebar tree", () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(app_1.default).get("/api/v1/sidebar-tree");
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body).toEqual([]);
    }));
    (0, vitest_1.it)("sidebar tree sorts by order", () => __awaiter(void 0, void 0, void 0, function* () {
        yield SidebarItem_1.default.create({
            name: "Second",
            path: "/second",
            icon: "second",
            order: 2,
            type: "module",
        });
        yield SidebarItem_1.default.create({
            name: "First",
            path: "/first",
            icon: "first",
            order: 1,
            type: "module",
        });
        const res = yield (0, supertest_1.default)(app_1.default).get("/api/v1/sidebar-tree");
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.length).toBe(2);
        (0, vitest_1.expect)(res.body[0].name).toBe("First");
        (0, vitest_1.expect)(res.body[1].name).toBe("Second");
    }));
    (0, vitest_1.it)("sidebar tree builds parent-child structure", () => __awaiter(void 0, void 0, void 0, function* () {
        const parent = yield SidebarItem_1.default.create({
            name: uniqueName("Parent"),
            path: "/parent",
            icon: "parent",
            order: 1,
            type: "module",
        });
        const child = yield SidebarItem_1.default.create({
            name: uniqueName("Child"),
            path: "/parent/child",
            icon: "child",
            order: 2,
            type: "feature",
            parentId: getId(parent),
        });
        const res = yield (0, supertest_1.default)(app_1.default).get("/api/v1/sidebar-tree");
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.length).toBe(1);
        (0, vitest_1.expect)(res.body[0]._id).toBe(getId(parent));
        (0, vitest_1.expect)(res.body[0].children.length).toBe(1);
        (0, vitest_1.expect)(res.body[0].children[0]._id).toBe(getId(child));
    }));
});
