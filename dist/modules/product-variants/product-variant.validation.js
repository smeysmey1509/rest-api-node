"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productVariantCreateValidation = void 0;
const productVariantCreateValidation = (req) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    const errors = [];
    if (!req.params.productId)
        errors.push("productId is required");
    if (!((_a = req.body) === null || _a === void 0 ? void 0 : _a.sku))
        errors.push("sku is required");
    const salePrice = Number((_h = (_f = (_d = (_c = (_b = req.body) === null || _b === void 0 ? void 0 : _b.pricing) === null || _c === void 0 ? void 0 : _c.salePrice) !== null && _d !== void 0 ? _d : (_e = req.body) === null || _e === void 0 ? void 0 : _e.salePrice) !== null && _f !== void 0 ? _f : (_g = req.body) === null || _g === void 0 ? void 0 : _g.price) !== null && _h !== void 0 ? _h : 0);
    if (!Number.isFinite(salePrice) || salePrice < 0)
        errors.push("salePrice must be greater than or equal to 0");
    const costPrice = (_l = (_k = (_j = req.body) === null || _j === void 0 ? void 0 : _j.pricing) === null || _k === void 0 ? void 0 : _k.costPrice) !== null && _l !== void 0 ? _l : (_m = req.body) === null || _m === void 0 ? void 0 : _m.costPrice;
    if (costPrice !== undefined && Number(costPrice) < 0)
        errors.push("costPrice must be greater than or equal to 0");
    return errors;
};
exports.productVariantCreateValidation = productVariantCreateValidation;
