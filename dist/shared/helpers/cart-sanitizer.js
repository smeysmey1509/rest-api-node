"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeCartItems = void 0;
const stripFormattedField = (value) => {
    if (!value || typeof value !== "object")
        return value;
    const _a = value, { formatted: _formatted } = _a, rest = __rest(_a, ["formatted"]);
    return rest;
};
const sanitizeCartItems = (items) => {
    if (!Array.isArray(items))
        return items;
    return items.map((item) => {
        const itemObj = typeof (item === null || item === void 0 ? void 0 : item.toObject) === "function" ? item.toObject() : item;
        if (!itemObj || typeof itemObj !== "object")
            return itemObj;
        const _a = itemObj, { formatted: _formatted, product } = _a, itemRest = __rest(_a, ["formatted", "product"]);
        const productObj = typeof (product === null || product === void 0 ? void 0 : product.toObject) === "function" ? product.toObject() : product;
        const sanitizedProduct = stripFormattedField(productObj);
        return Object.assign(Object.assign({}, itemRest), { product: sanitizedProduct });
    });
};
exports.sanitizeCartItems = sanitizeCartItems;
