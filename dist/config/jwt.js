"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtConfig = void 0;
exports.jwtConfig = {
    accessSecret: process.env.JWT_SECRET || "",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "",
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "1d",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
};
