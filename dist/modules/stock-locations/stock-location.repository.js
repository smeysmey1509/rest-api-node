"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stockLocationRepository = void 0;
const stock_location_model_1 = __importDefault(require("./stock-location.model"));
exports.stockLocationRepository = {
    list() {
        return stock_location_model_1.default.find().sort({ createdAt: -1 }).lean();
    },
    findById(id) {
        return stock_location_model_1.default.findById(id);
    },
    create(payload) {
        return stock_location_model_1.default.create(payload);
    },
    update(id, payload) {
        return stock_location_model_1.default.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
    },
    remove(id) {
        return stock_location_model_1.default.findByIdAndUpdate(id, { isActive: false }, { new: true });
    },
};
