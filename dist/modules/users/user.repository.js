"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRepository = void 0;
const user_model_1 = __importDefault(require("./user.model"));
const safeSelect = "name email role status limit createdAt updatedAt";
exports.userRepository = {
    findById(id) {
        return user_model_1.default.findById(id).select(safeSelect).lean();
    },
    list(filter, skip, limit) {
        return user_model_1.default.find(filter)
            .select(safeSelect)
            .sort({ createdAt: -1, _id: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
    },
    count(filter) {
        return user_model_1.default.countDocuments(filter);
    },
    updateProfile(id, updates) {
        return user_model_1.default.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true,
        })
            .select(safeSelect)
            .lean();
    },
    updateStatus(id, status) {
        return user_model_1.default.findByIdAndUpdate(id, { status }, { new: true, runValidators: true })
            .select(safeSelect)
            .lean();
    },
};
