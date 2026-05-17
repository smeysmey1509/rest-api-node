"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleRepository = void 0;
const role_model_1 = __importDefault(require("./role.model"));
exports.roleRepository = {
    listStoredRoles() {
        return role_model_1.default.find().lean();
    },
};
