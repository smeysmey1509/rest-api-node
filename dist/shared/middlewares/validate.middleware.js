"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const app_error_1 = require("../errors/app-error");
const validate = (validator) => {
    return (req, _res, next) => {
        const errors = validator(req) || [];
        if (errors.length) {
            next(new app_error_1.AppError("Validation failed", 400, "VALIDATION_ERROR", errors));
            return;
        }
        next();
    };
};
exports.validate = validate;
