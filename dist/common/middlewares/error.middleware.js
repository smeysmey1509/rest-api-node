"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMiddleware = exports.notFoundMiddleware = void 0;
const appError_1 = require("../utils/appError");
const notFoundMiddleware = (req, _res, next) => {
    next(new appError_1.AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};
exports.notFoundMiddleware = notFoundMiddleware;
const errorMiddleware = (err, _req, res, _next) => {
    const statusCode = (err === null || err === void 0 ? void 0 : err.statusCode) || 500;
    const isProduction = process.env.NODE_ENV === "production";
    if (!isProduction) {
        console.error(err);
    }
    res.status(statusCode).json({
        success: false,
        message: (err === null || err === void 0 ? void 0 : err.message) || "Internal server error",
        code: err === null || err === void 0 ? void 0 : err.code,
        details: err === null || err === void 0 ? void 0 : err.details,
        stack: isProduction ? undefined : err === null || err === void 0 ? void 0 : err.stack,
    });
};
exports.errorMiddleware = errorMiddleware;
