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
exports.inventoryUnitController = void 0;
const inventory_unit_service_1 = require("./inventory-unit.service");
exports.inventoryUnitController = {
    list(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            res.status(200).json({ units: yield inventory_unit_service_1.inventoryUnitService.list(req.query) });
        });
    },
    get(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            res.status(200).json(yield inventory_unit_service_1.inventoryUnitService.get(req.params.id));
        });
    },
    stockIn(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            res.status(201).json(yield inventory_unit_service_1.inventoryUnitService.stockIn(req.body || {}, (_a = req.user) === null || _a === void 0 ? void 0 : _a.id));
        });
    },
    reserve(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            res.status(200).json(yield inventory_unit_service_1.inventoryUnitService.reserve(req.body || {}, (_a = req.user) === null || _a === void 0 ? void 0 : _a.id));
        });
    },
    release(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            res.status(200).json(yield inventory_unit_service_1.inventoryUnitService.release(req.body || {}, (_a = req.user) === null || _a === void 0 ? void 0 : _a.id));
        });
    },
    sell(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            res.status(200).json(yield inventory_unit_service_1.inventoryUnitService.sell(req.body || {}, (_a = req.user) === null || _a === void 0 ? void 0 : _a.id));
        });
    },
    returnUnit(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            res.status(200).json(yield inventory_unit_service_1.inventoryUnitService.returnUnit(req.body || {}, (_a = req.user) === null || _a === void 0 ? void 0 : _a.id));
        });
    },
    search(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            res.status(200).json({ units: yield inventory_unit_service_1.inventoryUnitService.search(req.query) });
        });
    },
};
