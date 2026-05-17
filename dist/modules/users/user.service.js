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
exports.userService = void 0;
const app_error_1 = require("../../shared/errors/app-error");
const pagination_1 = require("../../shared/utils/pagination");
const user_repository_1 = require("./user.repository");
const profileFields = ["name", "email", "limit"];
const buildUserFilter = (query) => {
    const filter = {};
    const q = String(query.q || query.search || "").trim();
    if (q) {
        filter.$or = [
            { name: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
        ];
    }
    if (query.role) {
        filter.role = String(query.role).toUpperCase();
    }
    if (query.status) {
        filter.status = String(query.status).toUpperCase();
    }
    return filter;
};
exports.userService = {
    getCurrentUser(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!userId)
                throw new app_error_1.AppError("Unauthorized", 401);
            const user = yield user_repository_1.userRepository.findById(userId);
            if (!user)
                throw new app_error_1.AppError("User not found", 404);
            return user;
        });
    },
    updateCurrentUser(userId, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!userId)
                throw new app_error_1.AppError("Unauthorized", 401);
            const updates = Object.fromEntries(Object.entries(payload).filter(([key]) => profileFields.includes(key)));
            const user = yield user_repository_1.userRepository.updateProfile(userId, updates);
            if (!user)
                throw new app_error_1.AppError("User not found", 404);
            return user;
        });
    },
    listUsers(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const { page, limit, skip } = (0, pagination_1.getPagination)(query, { defaultLimit: 25, maxLimit: 100 });
            const filter = buildUserFilter(query);
            const [users, total] = yield Promise.all([
                user_repository_1.userRepository.list(filter, skip, limit),
                user_repository_1.userRepository.count(filter),
            ]);
            return Object.assign({ users }, (0, pagination_1.getPaginationMeta)(total, page, limit));
        });
    },
    getUser(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield user_repository_1.userRepository.findById(id);
            if (!user)
                throw new app_error_1.AppError("User not found.", 404);
            return user;
        });
    },
    updateUserStatus(id, status) {
        return __awaiter(this, void 0, void 0, function* () {
            const normalized = String(status || "").toUpperCase();
            if (!["ACTIVE", "INACTIVE", "BLOCKED"].includes(normalized)) {
                throw new app_error_1.AppError("Invalid user status", 400);
            }
            const user = yield user_repository_1.userRepository.updateStatus(id, normalized);
            if (!user)
                throw new app_error_1.AppError("User not found", 404);
            return user;
        });
    },
};
