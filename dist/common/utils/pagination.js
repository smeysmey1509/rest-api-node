"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaginationMeta = exports.getPagination = void 0;
const toPositiveInteger = (value, fallback) => {
    const parsed = Number.parseInt(String(value !== null && value !== void 0 ? value : ""), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const getPagination = (query, options = {}) => {
    var _a, _b;
    const defaultLimit = (_a = options.defaultLimit) !== null && _a !== void 0 ? _a : 25;
    const maxLimit = (_b = options.maxLimit) !== null && _b !== void 0 ? _b : 100;
    const page = Math.max(toPositiveInteger(query.page, 1), 1);
    const requestedLimit = toPositiveInteger(query.limit, defaultLimit);
    const limit = Math.min(Math.max(requestedLimit, 1), maxLimit);
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};
exports.getPagination = getPagination;
const getPaginationMeta = (total, page, limit) => ({
    total,
    page,
    perPage: limit,
    totalPages: Math.ceil(total / limit),
});
exports.getPaginationMeta = getPaginationMeta;
