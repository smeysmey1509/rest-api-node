"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supplierRepository = void 0;
const supplier_model_1 = __importDefault(require("./supplier.model"));
exports.supplierRepository = {
    list() {
        return supplier_model_1.default.find().sort({ createdAt: -1 }).lean();
    },
    findById(id) {
        return supplier_model_1.default.findById(id);
    },
    create(payload) {
        return supplier_model_1.default.create(payload);
    },
    update(id, payload) {
        return supplier_model_1.default.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
    },
    remove(id) {
        return supplier_model_1.default.findByIdAndUpdate(id, { isActive: false }, { new: true });
    },
};
