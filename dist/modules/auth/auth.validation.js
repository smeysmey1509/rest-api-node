"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginValidation = exports.registerValidation = void 0;
const registerValidation = (req) => {
    var _a, _b, _c;
    const errors = [];
    if (!((_a = req.body) === null || _a === void 0 ? void 0 : _a.name))
        errors.push("name is required");
    if (!((_b = req.body) === null || _b === void 0 ? void 0 : _b.email))
        errors.push("email is required");
    if (!((_c = req.body) === null || _c === void 0 ? void 0 : _c.password))
        errors.push("password is required");
    return errors;
};
exports.registerValidation = registerValidation;
const loginValidation = (req) => {
    var _a, _b, _c, _d;
    const errors = [];
    if (!(((_a = req.body) === null || _a === void 0 ? void 0 : _a.identifier) || ((_b = req.body) === null || _b === void 0 ? void 0 : _b.email) || ((_c = req.body) === null || _c === void 0 ? void 0 : _c.name))) {
        errors.push("identifier, email, or name is required");
    }
    if (!((_d = req.body) === null || _d === void 0 ? void 0 : _d.password))
        errors.push("password is required");
    return errors;
};
exports.loginValidation = loginValidation;
