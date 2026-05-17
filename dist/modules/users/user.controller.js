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
exports.userController = void 0;
const user_service_1 = require("./user.service");
exports.userController = {
    getProfile(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const user = yield user_service_1.userService.getCurrentUser((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
            res.status(200).json(user);
        });
    },
    legacyProfile(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const user = yield user_service_1.userService.getCurrentUser((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
            res.json({
                msg: "Welcome to the protected route!",
                userId: req.user,
                user,
            });
        });
    },
    updateProfile(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const user = yield user_service_1.userService.updateCurrentUser((_a = req.user) === null || _a === void 0 ? void 0 : _a.id, req.body);
            res.status(200).json(user);
        });
    },
    listUsers(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield user_service_1.userService.listUsers(req.query);
            res.status(200).json(result);
        });
    },
    getUser(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield user_service_1.userService.getUser(req.params.id);
            res.status(200).json(user);
        });
    },
    updateUserStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield user_service_1.userService.updateUserStatus(req.params.id, req.body.status);
            res.status(200).json(user);
        });
    },
};
