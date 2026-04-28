"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRepository = void 0;
const user_model_1 = __importDefault(require("./user.model"));
const safeSelect = "-password";
exports.userRepository = {
    findById(id) {
        return user_model_1.default.findById(id).select(safeSelect);
    },
    list() {
        return user_model_1.default.find().select(safeSelect).sort({ createdAt: -1 });
    },
    updateProfile(id, updates) {
        return user_model_1.default.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true,
        }).select(safeSelect);
    },
    updateStatus(id, status) {
        return user_model_1.default.findByIdAndUpdate(id, { status }, { new: true, runValidators: true }).select(safeSelect);
    },
};
