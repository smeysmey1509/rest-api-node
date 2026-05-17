"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productCreateValidation = void 0;
const productCreateValidation = (req) => {
    var _a, _b, _c, _d, _e;
    const errors = [];
    if (!((_a = req.body) === null || _a === void 0 ? void 0 : _a.name))
        errors.push("name is required");
    if (!((_b = req.body) === null || _b === void 0 ? void 0 : _b.category) && !((_c = req.body) === null || _c === void 0 ? void 0 : _c.categoryId))
        errors.push("category is required");
    if (((_d = req.body) === null || _d === void 0 ? void 0 : _d.trackingType) && !["SERIAL", "BATCH", "NONE"].includes(String(req.body.trackingType).toUpperCase())) {
        errors.push("trackingType must be SERIAL, BATCH, or NONE");
    }
    if (((_e = req.body) === null || _e === void 0 ? void 0 : _e.productType) &&
        !["PHONE", "LAPTOP", "COMPUTER", "TABLET", "ACCESSORY", "ELECTRONIC", "OTHER"].includes(String(req.body.productType).toUpperCase())) {
        errors.push("productType is invalid");
    }
    return errors;
};
exports.productCreateValidation = productCreateValidation;
