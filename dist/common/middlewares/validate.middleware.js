"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const appError_1 = require("../utils/appError");
const validate = (validator) => {
    return (req, _res, next) => {
        const errors = validator(req) || [];
        if (errors.length) {
            next(new appError_1.AppError("Validation failed", 400, "VALIDATION_ERROR", errors));
            return;
        }
        next();
    };
};
exports.validate = validate;
