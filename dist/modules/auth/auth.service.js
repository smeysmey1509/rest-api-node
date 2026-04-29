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
const crypto_1 = require("crypto");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwt_1 = require("../../config/jwt");
const roles_1 = require("../../common/constants/roles");
const appError_1 = require("../../common/utils/appError");
const auth_repository_1 = require("./auth.repository");
const normalizeEmail = (email) => email.toLowerCase().trim();
const normalizeIdentifier = (identifier) => identifier.trim();
const assertJwtConfig = () => {
    if (!jwt_1.jwtConfig.accessSecret || !jwt_1.jwtConfig.refreshSecret) {
        throw new appError_1.AppError("JWT secret not configured", 500);
    }
};
const signToken = (payload, secret, expiresIn) => jsonwebtoken_1.default.sign(payload, secret, {
    expiresIn,
    issuer: jwt_1.jwtConfig.issuer,
    audience: jwt_1.jwtConfig.audience,
});
const verifyRefreshToken = (refreshToken) => {
    try {
        return jsonwebtoken_1.default.verify(refreshToken, jwt_1.jwtConfig.refreshSecret, {
            issuer: jwt_1.jwtConfig.issuer,
            audience: jwt_1.jwtConfig.audience,
        });
    }
    catch (_a) {
        throw new appError_1.AppError("Invalid or expired refresh token", 401);
    }
};
const publicUser = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
});
const buildTokens = (user) => ({
    accessToken: signToken({ id: String(user._id), role: user.role, tokenType: "access" }, jwt_1.jwtConfig.accessSecret, jwt_1.jwtConfig.accessExpiresIn),
    refreshToken: signToken({
        id: String(user._id),
        role: user.role,
        tokenType: "refresh",
        jti: (0, crypto_1.randomUUID)(),
    }, jwt_1.jwtConfig.refreshSecret, jwt_1.jwtConfig.refreshExpiresIn),
});
exports.authService = {
    register(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            assertJwtConfig();
            const email = normalizeEmail(payload.email);
            const existing = yield auth_repository_1.authRepository.findByEmail(email);
            if (existing)
                throw new appError_1.AppError("User already exists", 409);
            const user = yield auth_repository_1.authRepository.create({
                name: payload.name.trim(),
                email,
                password: payload.password,
                role: roles_1.Roles.CUSTOMER,
            });
            const tokens = buildTokens(user);
            return Object.assign(Object.assign({}, tokens), { user: publicUser(user) });
        });
    },
    login(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            assertJwtConfig();
            const user = yield auth_repository_1.authRepository.findByLogin(normalizeIdentifier(payload.identifier));
            if (!user)
                throw new appError_1.AppError("Invalid credentials", 401);
            if (user.status && user.status !== "ACTIVE") {
                throw new appError_1.AppError("User account is not active", 403);
            }
            const isMatch = yield user.comparePassword(payload.password);
            if (!isMatch)
                throw new appError_1.AppError("Invalid credentials", 401);
            const tokens = buildTokens(user);
            return Object.assign(Object.assign({}, tokens), { user: publicUser(user) });
        });
    },
    refresh(refreshToken) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!refreshToken)
                throw new appError_1.AppError("No refresh token provided", 401);
            assertJwtConfig();
            const decoded = verifyRefreshToken(refreshToken);
            if (!decoded.id || decoded.tokenType !== "refresh") {
                throw new appError_1.AppError("Invalid refresh token", 401);
            }
            const user = yield auth_repository_1.authRepository.findById(String(decoded.id));
            if (!user)
                throw new appError_1.AppError("User not found", 404);
            if (user.status && user.status !== "ACTIVE") {
                throw new appError_1.AppError("User account is not active", 403);
            }
            const tokens = buildTokens(user);
            return Object.assign(Object.assign({}, tokens), { user: publicUser(user) });
        });
    },
};
