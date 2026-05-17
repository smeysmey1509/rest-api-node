"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwt_1 = require("../../config/jwt");
const roles_1 = require("../constants/roles");
const extractBearerToken = (req) => {
    const authHeader = req.headers.authorization;
    return (authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith("Bearer "))
        ? authHeader.slice("Bearer ".length).trim()
        : undefined;
};
const verifyAccessToken = (token) => {
    const decoded = jsonwebtoken_1.default.verify(token, jwt_1.jwtConfig.accessSecret, {
        issuer: jwt_1.jwtConfig.issuer,
        audience: jwt_1.jwtConfig.audience,
    });
    if (!decoded.id || !decoded.role || decoded.tokenType !== "access") {
        throw new Error("Invalid token payload");
    }
    return {
        id: String(decoded.id),
        role: (0, roles_1.normalizeRole)(String(decoded.role)),
    };
};
const authenticateToken = (req, res, next) => {
    var _a, _b;
    const token = extractBearerToken(req);
    if (token) {
        if (!jwt_1.jwtConfig.accessSecret) {
            res.status(500).json({ message: "JWT secret not configured" });
            return;
        }
        try {
            req.user = verifyAccessToken(token);
            next();
            return;
        }
        catch (_c) {
            res.status(401).json({ message: "Invalid or expired token" });
            return;
        }
    }
    const expectedApiKey = process.env.API_KEY;
    const apiKey = req.headers["x-api-key"];
    if (expectedApiKey && apiKey === expectedApiKey) {
        req.user = {
            id: (_a = process.env.API_KEY_USER_ID) !== null && _a !== void 0 ? _a : "service-account",
            role: (0, roles_1.normalizeRole)((_b = process.env.API_KEY_ROLE) !== null && _b !== void 0 ? _b : "ADMIN"),
        };
        next();
        return;
    }
    res.status(401).json({ message: "Authentication required" });
};
exports.authenticateToken = authenticateToken;
const optionalAuth = (req, _res, next) => {
    const token = extractBearerToken(req);
    if (!token || !jwt_1.jwtConfig.accessSecret) {
        next();
        return;
    }
    try {
        req.user = verifyAccessToken(token);
    }
    catch (_a) {
        // Public routes must stay public; ignore bad optional tokens.
    }
    next();
};
exports.optionalAuth = optionalAuth;
