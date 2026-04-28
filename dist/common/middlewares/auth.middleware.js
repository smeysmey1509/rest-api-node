"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const roles_1 = require("../constants/roles");
const authenticateToken = (req, res, next) => {
    var _a, _b;
    const authHeader = req.headers.authorization;
    const token = (authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith("Bearer "))
        ? authHeader.slice("Bearer ".length)
        : undefined;
    if (token) {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            res.status(500).json({ error: "JWT secret not configured" });
            return;
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
            req.user = {
                id: String(decoded.id),
                role: (0, roles_1.normalizeRole)(decoded.role),
            };
            next();
            return;
        }
        catch (_c) {
            res.status(403).json({ message: "Invalid token" });
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
    const authHeader = req.headers.authorization;
    const token = (authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith("Bearer "))
        ? authHeader.slice("Bearer ".length)
        : undefined;
    const jwtSecret = process.env.JWT_SECRET;
    if (!token || !jwtSecret) {
        next();
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        req.user = {
            id: String(decoded.id),
            role: (0, roles_1.normalizeRole)(decoded.role),
        };
    }
    catch (_a) {
        // Public routes must stay public; ignore bad optional tokens.
    }
    next();
};
exports.optionalAuth = optionalAuth;
