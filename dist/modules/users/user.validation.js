"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStatusValidation = void 0;
const updateStatusValidation = (req) => {
    var _a;
    const errors = [];
    if (!((_a = req.body) === null || _a === void 0 ? void 0 : _a.status))
        errors.push("status is required");
    return errors;
};
exports.updateStatusValidation = updateStatusValidation;
