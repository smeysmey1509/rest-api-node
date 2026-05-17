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
exports.stockLocationService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const app_error_1 = require("../../shared/errors/app-error");
const stock_location_repository_1 = require("./stock-location.repository");
const ensureId = (id) => {
    if (!mongoose_1.default.isValidObjectId(id))
        throw new app_error_1.AppError("Invalid stock location id", 400);
};
exports.stockLocationService = {
    list() {
        return stock_location_repository_1.stockLocationRepository.list();
    },
    get(id) {
        return __awaiter(this, void 0, void 0, function* () {
            ensureId(id);
            const location = yield stock_location_repository_1.stockLocationRepository.findById(id);
            if (!location)
                throw new app_error_1.AppError("Stock location not found", 404);
            return location;
        });
    },
    create(payload) {
        return stock_location_repository_1.stockLocationRepository.create({
            name: payload.name,
            code: payload.code,
            type: String(payload.type || "").toUpperCase(),
            address: payload.address,
            isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
        });
    },
    update(id, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            ensureId(id);
            const location = yield stock_location_repository_1.stockLocationRepository.update(id, payload);
            if (!location)
                throw new app_error_1.AppError("Stock location not found", 404);
            return location;
        });
    },
    remove(id) {
        return __awaiter(this, void 0, void 0, function* () {
            ensureId(id);
            const location = yield stock_location_repository_1.stockLocationRepository.remove(id);
            if (!location)
                throw new app_error_1.AppError("Stock location not found", 404);
            return { msg: "Stock location deleted successfully." };
        });
    },
};
