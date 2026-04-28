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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryService = void 0;
const product_model_1 = __importDefault(require("../products/product.model"));
const appError_1 = require("../../common/utils/appError");
const generateSlug_1 = require("../../common/utils/generateSlug");
const category_repository_1 = require("./category.repository");
const parseSort = (input) => {
    const sort = {};
    (input || "categoryName:1").split(",").forEach((pair) => {
        const [field, dir] = pair.split(":");
        if (field)
            sort[field] = dir === "-1" ? -1 : 1;
    });
    return sort;
};
const normalizePayload = (payload) => {
    const categoryName = String(payload.categoryName || payload.name || "").trim();
    const categoryId = String(payload.categoryId || payload.slug || (0, generateSlug_1.generateSlug)(categoryName)).trim();
    return {
        categoryId,
        categoryName,
        description: String(payload.description || ""),
        productCount: Number(payload.productCount || 0),
        totalStock: Number(payload.totalStock || 0),
        avgPrice: Number(payload.avgPrice || 0),
        totalSales: Number(payload.totalSales || 0),
    };
};
exports.categoryService = {
    list(query) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const q = String((_a = query.q) !== null && _a !== void 0 ? _a : "").trim();
            const page = Math.max(parseInt(String((_b = query.page) !== null && _b !== void 0 ? _b : "1"), 10), 1);
            const limit = Math.min(Math.max(parseInt(String((_c = query.limit) !== null && _c !== void 0 ? _c : "25"), 10), 1), 100);
            const skip = (page - 1) * limit;
            const sort = parseSort(String((_d = query.sort) !== null && _d !== void 0 ? _d : "categoryName:1"));
            const filter = {};
            if (q) {
                filter.$or = [
                    { categoryName: { $regex: q, $options: "i" } },
                    { categoryId: { $regex: q, $options: "i" } },
                    { description: { $regex: q, $options: "i" } },
                ];
            }
            const [categories, total] = yield Promise.all([
                category_repository_1.categoryRepository.list(filter, sort, skip, limit),
                category_repository_1.categoryRepository.count(filter),
            ]);
            return { categories, total, page, perPage: limit, totalPages: Math.ceil(total / limit) };
        });
    },
    listRaw(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.list(Object.assign(Object.assign({}, query), { limit: query.limit || 100 }));
            return result.categories;
        });
    },
    getById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const category = yield category_repository_1.categoryRepository.findById(id);
            if (!category)
                throw new appError_1.AppError("Category not found.", 404);
            return category;
        });
    },
    create(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const normalized = normalizePayload(payload);
            if (!normalized.categoryId || !normalized.categoryName) {
                throw new appError_1.AppError("categoryId and categoryName are required", 400);
            }
            try {
                return yield category_repository_1.categoryRepository.create(normalized);
            }
            catch (err) {
                if ((err === null || err === void 0 ? void 0 : err.code) === 11000)
                    throw new appError_1.AppError("Duplicate category", 409, undefined, err.keyValue);
                throw err;
            }
        });
    },
    update(id, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const updates = {};
            if (payload.categoryName !== undefined || payload.name !== undefined) {
                updates.categoryName = String(payload.categoryName || payload.name || "").trim();
            }
            if (payload.categoryId !== undefined || payload.slug !== undefined) {
                updates.categoryId = String(payload.categoryId || payload.slug || "").trim();
            }
            if (payload.description !== undefined)
                updates.description = String(payload.description);
            if (payload.productCount !== undefined)
                updates.productCount = Number(payload.productCount) || 0;
            if (payload.totalStock !== undefined)
                updates.totalStock = Number(payload.totalStock) || 0;
            if (payload.avgPrice !== undefined)
                updates.avgPrice = Number(payload.avgPrice) || 0;
            if (payload.totalSales !== undefined)
                updates.totalSales = Number(payload.totalSales) || 0;
            const category = yield category_repository_1.categoryRepository.update(id, updates);
            if (!category)
                throw new appError_1.AppError("Category not found.", 404);
            return category;
        });
    },
    remove(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const usedByProduct = yield product_model_1.default.exists({ category: id });
            if (usedByProduct) {
                throw new appError_1.AppError("Category is used by products and cannot be deleted.", 400);
            }
            const category = yield category_repository_1.categoryRepository.delete(id);
            if (!category)
                throw new appError_1.AppError("Category not found.", 404);
            return { msg: "Category deleted successfully." };
        });
    },
};
