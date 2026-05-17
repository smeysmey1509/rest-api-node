"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryRepository = void 0;
const category_model_1 = __importDefault(require("./category.model"));
exports.categoryRepository = {
    list(filter, sort, skip, limit) {
        return category_model_1.default.find(filter).sort(sort).skip(skip).limit(limit).lean();
    },
    count(filter) {
        return category_model_1.default.countDocuments(filter);
    },
    findById(id) {
        return category_model_1.default.findById(id);
    },
    create(payload) {
        return category_model_1.default.create(payload);
    },
    update(id, payload) {
        return category_model_1.default.findByIdAndUpdate(id, payload, {
            new: true,
            runValidators: true,
        });
    },
    delete(id) {
        return category_model_1.default.findByIdAndDelete(id);
    },
};
