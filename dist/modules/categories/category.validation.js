"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryCreateValidation = void 0;
const categoryCreateValidation = (req) => {
    var _a, _b;
    const errors = [];
    if (!(((_a = req.body) === null || _a === void 0 ? void 0 : _a.categoryName) || ((_b = req.body) === null || _b === void 0 ? void 0 : _b.name)))
        errors.push("categoryName or name is required");
    return errors;
};
exports.categoryCreateValidation = categoryCreateValidation;
