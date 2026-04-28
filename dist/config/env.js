"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.env = {
    nodeEnv: process.env.NODE_ENV || "development",
    port: Number(process.env.PORT || 5002),
    mongoUri: process.env.MONGO_URI || "",
    corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
    proxyTarget: process.env.PROXY_TARGET,
};
