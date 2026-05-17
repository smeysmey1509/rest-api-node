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
exports.brandService = void 0;
const app_error_1 = require("../../shared/errors/app-error");
const generateSlug_1 = require("../../shared/utils/generateSlug");
const brand_repository_1 = require("./brand.repository");
const parseSort = (input) => {
    const sort = {};
    (input || "name:1").split(",").forEach((pair) => {
        const [field, dir] = pair.split(":");
        if (field)
            sort[field] = dir === "-1" ? -1 : 1;
    });
    return sort;
};
exports.brandService = {
    list(query) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const q = String((_a = query.q) !== null && _a !== void 0 ? _a : "").trim();
            const page = Math.max(parseInt(String((_b = query.page) !== null && _b !== void 0 ? _b : "1"), 10), 1);
            const limit = Math.min(Math.max(parseInt(String((_c = query.limit) !== null && _c !== void 0 ? _c : "25"), 10), 1), 100);
            const skip = (page - 1) * limit;
            const sort = parseSort(String((_d = query.sort) !== null && _d !== void 0 ? _d : "name:1"));
            const filter = {};
            if (q) {
                filter.$or = [
                    { name: { $regex: q, $options: "i" } },
                    { slug: { $regex: q, $options: "i" } },
                ];
            }
            if (typeof query.isActive !== "undefined") {
                const value = String(query.isActive);
                filter.isActive = value === "1" || value.toLowerCase() === "true";
            }
            const [brands, total] = yield Promise.all([
                brand_repository_1.brandRepository.list(filter, sort, skip, limit),
                brand_repository_1.brandRepository.count(filter),
            ]);
            return { brands, total, page, perPage: limit, totalPages: Math.ceil(total / limit) };
        });
    },
    create(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const name = String(payload.name || "").trim();
            if (!name)
                throw new app_error_1.AppError("name is required", 400);
            const slug = String(payload.slug || (0, generateSlug_1.generateSlug)(name)).trim();
            if (!slug)
                throw new app_error_1.AppError("slug could not be derived from name", 400);
            try {
                return yield brand_repository_1.brandRepository.create({
                    name,
                    slug: (0, generateSlug_1.generateSlug)(slug),
                    isActive: typeof payload.isActive === "boolean" ? payload.isActive : true,
                });
            }
            catch (err) {
                if ((err === null || err === void 0 ? void 0 : err.code) === 11000)
                    throw new app_error_1.AppError("Brand already exists.", 409);
                throw err;
            }
        });
    },
    update(id, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const updates = {};
            if (payload.name !== undefined)
                updates.name = String(payload.name).trim();
            if (payload.slug !== undefined)
                updates.slug = (0, generateSlug_1.generateSlug)(String(payload.slug));
            if (payload.isActive !== undefined)
                updates.isActive = Boolean(payload.isActive);
            const brand = yield brand_repository_1.brandRepository.update(id, updates);
            if (!brand)
                throw new app_error_1.AppError("Brand not found", 404);
            return brand;
        });
    },
    remove(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const brand = yield brand_repository_1.brandRepository.delete(id);
            if (!brand)
                throw new app_error_1.AppError("Brand not found", 404);
            return { msg: "Brand deleted successfully." };
        });
    },
};
