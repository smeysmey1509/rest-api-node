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
Object.defineProperty(exports, "__esModule", { value: true });
exports.productController = void 0;
const product_service_1 = require("./product.service");
const getFiles = (req) => Array.isArray(req.files) ? req.files : undefined;
exports.productController = {
    list(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const result = yield product_service_1.productService.list(req.query, (_a = req.user) === null || _a === void 0 ? void 0 : _a.role);
            res.status(200).json(result);
        });
    },
    listRaw(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const result = yield product_service_1.productService.listRaw(req.query, (_a = req.user) === null || _a === void 0 ? void 0 : _a.role);
            res.status(200).json(result);
        });
    },
    search(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const result = yield product_service_1.productService.search(req.query, (_a = req.user) === null || _a === void 0 ? void 0 : _a.role);
            res.status(200).json(result);
        });
    },
    get(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const product = yield product_service_1.productService.getByIdOrSlug(req.params.id || req.params.idOrSlug);
            res.status(200).json(product);
        });
    },
    create(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const product = yield product_service_1.productService.create(req.body || {}, getFiles(req), (_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
            res.status(201).json(product);
        });
    },
    update(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const product = yield product_service_1.productService.update(req.params.id, req.body || {}, getFiles(req), (_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
            res.status(200).json(product);
        });
    },
    remove(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const result = yield product_service_1.productService.remove(req.params.id, (_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
            res.status(200).json(result);
        });
    },
    removeMany(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const ids = Array.isArray((_a = req.body) === null || _a === void 0 ? void 0 : _a.ids) ? req.body.ids : [];
            const result = yield product_service_1.productService.removeMany(ids, (_b = req.user) === null || _b === void 0 ? void 0 : _b.id);
            res.status(200).json(result);
        });
    },
    recommendations(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield product_service_1.productService.recommendations(req.params.id);
            res.status(200).json(result);
        });
    },
};
