"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productCreateValidation = void 0;
const productCreateValidation = (req) => {
    var _a, _b;
    const errors = [];
    if (!((_a = req.body) === null || _a === void 0 ? void 0 : _a.name))
        errors.push("name is required");
    if (!((_b = req.body) === null || _b === void 0 ? void 0 : _b.category))
        errors.push("category is required");
    return errors;
};
exports.productCreateValidation = productCreateValidation;
