"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewCreateValidation = void 0;
const reviewCreateValidation = (req) => {
    var _a, _b, _c;
    const errors = [];
    if (!(((_a = req.body) === null || _a === void 0 ? void 0 : _a.productId) || ((_b = req.body) === null || _b === void 0 ? void 0 : _b.product)))
        errors.push("productId is required");
    if (!((_c = req.body) === null || _c === void 0 ? void 0 : _c.rating))
        errors.push("rating is required");
    return errors;
};
exports.reviewCreateValidation = reviewCreateValidation;
