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
exports.stockLocationController = void 0;
const stock_location_service_1 = require("./stock-location.service");
exports.stockLocationController = {
    list(_req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            res.status(200).json({ locations: yield stock_location_service_1.stockLocationService.list() });
        });
    },
    get(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            res.status(200).json(yield stock_location_service_1.stockLocationService.get(req.params.id));
        });
    },
    create(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            res.status(201).json(yield stock_location_service_1.stockLocationService.create(req.body || {}));
        });
    },
    update(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            res.status(200).json(yield stock_location_service_1.stockLocationService.update(req.params.id, req.body || {}));
        });
    },
    remove(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            res.status(200).json(yield stock_location_service_1.stockLocationService.remove(req.params.id));
        });
    },
};
