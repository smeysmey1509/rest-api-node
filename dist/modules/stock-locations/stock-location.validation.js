"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stockLocationValidation = void 0;
const stockLocationValidation = (req) => {
    var _a, _b, _c;
    const errors = [];
    if (!((_a = req.body) === null || _a === void 0 ? void 0 : _a.name))
        errors.push("name is required");
    if (!((_b = req.body) === null || _b === void 0 ? void 0 : _b.code))
        errors.push("code is required");
    if (!["WAREHOUSE", "STORE", "POS_BRANCH"].includes(String(((_c = req.body) === null || _c === void 0 ? void 0 : _c.type) || "").toUpperCase())) {
        errors.push("type must be WAREHOUSE, STORE, or POS_BRANCH");
    }
    return errors;
};
exports.stockLocationValidation = stockLocationValidation;
