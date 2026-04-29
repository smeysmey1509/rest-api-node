"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginValidation = exports.registerValidation = void 0;
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const NAME_RE = /^[a-zA-Z0-9_.\-\s]+$/;
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;
const isString = (value) => typeof value === "string" && value.trim().length > 0;
const registerValidation = (req) => {
    var _a, _b, _c;
    const errors = [];
    const name = (_a = req.body) === null || _a === void 0 ? void 0 : _a.name;
    const email = (_b = req.body) === null || _b === void 0 ? void 0 : _b.email;
    const password = (_c = req.body) === null || _c === void 0 ? void 0 : _c.password;
    if (!isString(name)) {
        errors.push("name is required");
    }
    else {
        const normalizedName = name.trim();
        if (normalizedName.length < 3 || normalizedName.length > 80) {
            errors.push("name must be between 3 and 80 characters");
        }
        if (!NAME_RE.test(normalizedName)) {
            errors.push("name contains unsupported characters");
        }
    }
    if (!isString(email)) {
        errors.push("email is required");
    }
    else {
        const normalizedEmail = email.trim().toLowerCase();
        if (normalizedEmail.length > 120 || !EMAIL_RE.test(normalizedEmail)) {
            errors.push("email must be valid");
        }
    }
    if (!isString(password)) {
        errors.push("password is required");
    }
    else if (!PASSWORD_RE.test(password)) {
        errors.push("password must be 8-72 characters and include at least one letter and one number");
    }
    return errors;
};
exports.registerValidation = registerValidation;
const loginValidation = (req) => {
    var _a, _b, _c, _d;
    const errors = [];
    const identifier = ((_a = req.body) === null || _a === void 0 ? void 0 : _a.identifier) || ((_b = req.body) === null || _b === void 0 ? void 0 : _b.email) || ((_c = req.body) === null || _c === void 0 ? void 0 : _c.name);
    const password = (_d = req.body) === null || _d === void 0 ? void 0 : _d.password;
    if (!isString(identifier)) {
        errors.push("identifier, email, or name is required");
    }
    else if (String(identifier).trim().length > 120) {
        errors.push("identifier is too long");
    }
    if (!isString(password)) {
        errors.push("password is required");
    }
    else if (String(password).length > 72) {
        errors.push("password is too long");
    }
    return errors;
};
exports.loginValidation = loginValidation;
