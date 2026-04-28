"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const auth_service_1 = require("./auth.service");
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
};
exports.authController = {
    register(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield auth_service_1.authService.register(req.body);
            res.json(result);
        });
    },
    login(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const identifier = req.body.identifier || req.body.email || req.body.name;
            const result = yield auth_service_1.authService.login({
                identifier,
                password: req.body.password,
            });
            res.cookie("refreshToken", result.refreshToken, cookieOptions);
            res.json({ accessToken: result.accessToken, user: result.user });
        });
    },
    refresh(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const result = yield auth_service_1.authService.refresh((_a = req.cookies) === null || _a === void 0 ? void 0 : _a.refreshToken);
            res.json(result);
        });
    },
    logout(_req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            res.clearCookie("refreshToken", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
            });
            res.status(200).json({ msg: "Logged out" });
        });
    },
};
