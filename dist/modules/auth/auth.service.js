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
exports.authService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwt_1 = require("../../config/jwt");
const roles_1 = require("../../common/constants/roles");
const appError_1 = require("../../common/utils/appError");
const auth_repository_1 = require("./auth.repository");
const signToken = (payload, secret, expiresIn) => jsonwebtoken_1.default.sign(payload, secret, { expiresIn });
const publicUser = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
});
exports.authService = {
    register(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!jwt_1.jwtConfig.accessSecret) {
                throw new appError_1.AppError("JWT secret not configured", 500);
            }
            const existing = yield auth_repository_1.authRepository.findByEmail(payload.email);
            if (existing)
                throw new appError_1.AppError("User already exists", 400);
            const user = yield auth_repository_1.authRepository.create({
                name: payload.name,
                email: payload.email,
                password: payload.password,
                role: roles_1.Roles.CUSTOMER,
            });
            const token = signToken({ id: String(user._id), role: user.role }, jwt_1.jwtConfig.accessSecret, jwt_1.jwtConfig.accessExpiresIn);
            return { token, user: publicUser(user) };
        });
    },
    login(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!jwt_1.jwtConfig.accessSecret || !jwt_1.jwtConfig.refreshSecret) {
                throw new appError_1.AppError("JWT secret not configured", 500);
            }
            const user = yield auth_repository_1.authRepository.findByLogin(payload.identifier);
            if (!user)
                throw new appError_1.AppError("User does not exist", 400);
            if (user.status && user.status !== "ACTIVE") {
                throw new appError_1.AppError("User account is not active", 403);
            }
            const isMatch = yield user.comparePassword(payload.password);
            if (!isMatch)
                throw new appError_1.AppError("Invalid credentials", 400);
            const accessToken = signToken({ id: String(user._id), role: user.role }, jwt_1.jwtConfig.accessSecret, jwt_1.jwtConfig.accessExpiresIn);
            const refreshToken = signToken({ id: String(user._id), role: user.role }, jwt_1.jwtConfig.refreshSecret, jwt_1.jwtConfig.refreshExpiresIn);
            return { accessToken, refreshToken, user: publicUser(user) };
        });
    },
    refresh(refreshToken) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!refreshToken)
                throw new appError_1.AppError("No refresh token provided!", 401);
            if (!jwt_1.jwtConfig.accessSecret || !jwt_1.jwtConfig.refreshSecret) {
                throw new appError_1.AppError("JWT secret not configured.", 500);
            }
            const decoded = jsonwebtoken_1.default.verify(refreshToken, jwt_1.jwtConfig.refreshSecret);
            const user = yield auth_repository_1.authRepository.findById(String(decoded.id));
            if (!user)
                throw new appError_1.AppError("User not found", 404);
            if (user.status && user.status !== "ACTIVE") {
                throw new appError_1.AppError("User account is not active", 403);
            }
            const accessToken = signToken({ id: String(user._id), role: user.role }, jwt_1.jwtConfig.accessSecret, jwt_1.jwtConfig.accessExpiresIn);
            return { accessToken };
        });
    },
};
