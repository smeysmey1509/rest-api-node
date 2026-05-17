"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const mongoose_1 = __importStar(require("mongoose"));
const role_1 = require("../../shared/types/role");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const roles_1 = require("../../shared/constants/roles");
const userSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 80,
        trim: true,
        index: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        maxlength: 120,
        match: [/\S+@\S+\.\S+/, "Invalid email"],
    },
    password: {
        type: String,
        required: true,
        minlength: 8,
        maxlength: 72,
        select: false,
    },
    role: {
        type: String,
        enum: [...Object.values(roles_1.Roles), role_1.Role.USER, role_1.Role.EDITOR, role_1.Role.VIEWER],
        default: roles_1.Roles.CUSTOMER,
        set: (value) => (0, roles_1.normalizeRole)(value),
        index: true,
    },
    status: {
        type: String,
        enum: ["ACTIVE", "INACTIVE", "BLOCKED"],
        default: "ACTIVE",
        index: true,
    },
    limit: {
        type: Number,
        default: 10,
    },
}, {
    timestamps: true,
});
userSchema.pre("validate", function (next) {
    var _a, _b;
    this.name = (_a = this.name) === null || _a === void 0 ? void 0 : _a.trim();
    this.email = (_b = this.email) === null || _b === void 0 ? void 0 : _b.toLowerCase().trim();
    this.role = (0, roles_1.normalizeRole)(String(this.role));
    next();
});
//Hash password before saving
userSchema.pre("save", function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!this.isModified("password"))
            return next();
        const salt = yield bcryptjs_1.default.genSalt(12);
        this.password = yield bcryptjs_1.default.hash(this.password, salt);
        next();
    });
});
//method to compare password
userSchema.methods.comparePassword = function (candidatePassword) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield bcryptjs_1.default.compare(candidatePassword, this.password);
    });
};
userSchema.index({ createdAt: -1, _id: -1 });
userSchema.index({ status: 1, role: 1, createdAt: -1 });
exports.default = mongoose_1.default.model("User", userSchema);
