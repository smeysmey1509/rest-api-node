"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRoles = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticateToken = (req, res, next) => {
    var _a, _b;
    const expectedApiKey = process.env.API_KEY;
    if (!expectedApiKey) {
        res.status(500).json({ error: "API key not configured" });
        return;
    }
    const apiKey = req.headers["x-api-key"];
    if (!apiKey) {
        res.status(401).json({ message: "API key required" });
        return;
    }
    if (apiKey !== expectedApiKey) {
        res.status(403).json({ message: "Invalid API key" });
        return;
    }
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) {
        req.user = {
            id: (_a = process.env.API_KEY_USER_ID) !== null && _a !== void 0 ? _a : "service-account",
            role: (_b = process.env.API_KEY_ROLE) !== null && _b !== void 0 ? _b : "system",
        };
        next();
        return;
    }
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        res.status(500).json({ error: "JWT secret not configureddddddddd" });
        return;
    }
    jsonwebtoken_1.default.verify(token, jwtSecret, (err, user) => {
        if (err) {
            res.status(403).json({ message: "Invalid token" });
            return;
        }
        req.user = user;
        next();
    });
};
exports.authenticateToken = authenticateToken;
// Role checker
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user || !roles.includes(user.role)) {
            res.status(403).json({ msg: "Forbidden: insufficient role" });
            return;
        }
        next();
    };
};
exports.authorizeRoles = authorizeRoles;
