"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supplierValidation = void 0;
const supplierValidation = (req) => {
    var _a, _b;
    const errors = [];
    if (!((_a = req.body) === null || _a === void 0 ? void 0 : _a.name))
        errors.push("name is required");
    if (((_b = req.body) === null || _b === void 0 ? void 0 : _b.email) && !String(req.body.email).includes("@"))
        errors.push("email is invalid");
    return errors;
};
exports.supplierValidation = supplierValidation;
