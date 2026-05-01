"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRepository = void 0;
const user_model_1 = __importDefault(require("../users/user.model"));
const publicAuthSelect = "name email role status limit createdAt updatedAt";
exports.authRepository = {
    findByEmail(email) {
        return user_model_1.default.findOne({ email: email.toLowerCase().trim() })
            .select("_id")
            .lean();
    },
    findByLogin(identifier) {
        const value = identifier.trim();
        return user_model_1.default.findOne({
            $or: [{ email: value.toLowerCase() }, { name: value }],
        }).select(`+password ${publicAuthSelect}`);
    },
    findActiveById(id) {
        return user_model_1.default.findOne({ _id: id, status: "ACTIVE" })
            .select(publicAuthSelect)
            .lean();
    },
    create(payload) {
        return user_model_1.default.create(payload);
    },
};
