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
exports.brandController = void 0;
const brand_service_1 = require("./brand.service");
exports.brandController = {
    list(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield brand_service_1.brandService.list(req.query);
            res.status(200).json(result);
        });
    },
    create(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const brand = yield brand_service_1.brandService.create(req.body || {});
            res.status(201).json(brand);
        });
    },
    update(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const brand = yield brand_service_1.brandService.update(req.params.id, req.body || {});
            res.status(200).json(brand);
        });
    },
    remove(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield brand_service_1.brandService.remove(req.params.id);
            res.status(200).json(result);
        });
    },
};
