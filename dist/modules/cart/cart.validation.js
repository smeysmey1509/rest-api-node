"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addCartValidation = void 0;
const addCartValidation = (req) => {
    var _a;
    const errors = [];
    if (!((_a = req.body) === null || _a === void 0 ? void 0 : _a.productId))
        errors.push("productId is required");
    return errors;
};
exports.addCartValidation = addCartValidation;
