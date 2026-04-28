"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRepository = void 0;
const user_model_1 = __importDefault(require("../users/user.model"));
exports.authRepository = {
    findByEmail(email) {
        return user_model_1.default.findOne({ email: email.toLowerCase().trim() });
    },
    findByLogin(identifier) {
        const value = identifier.trim();
        return user_model_1.default.findOne({
            $or: [{ email: value.toLowerCase() }, { name: value }],
        }).select("+password");
    },
    findById(id) {
        return user_model_1.default.findById(id);
    },
    create(payload) {
        return user_model_1.default.create(payload);
    },
};
