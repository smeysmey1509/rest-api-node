"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.brandCreateValidation = void 0;
const brandCreateValidation = (req) => {
    var _a;
    const errors = [];
    if (!((_a = req.body) === null || _a === void 0 ? void 0 : _a.name))
        errors.push("name is required");
    return errors;
};
exports.brandCreateValidation = brandCreateValidation;
