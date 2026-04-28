"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.productService = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const appError_1 = require("../../common/utils/appError");
const generateSlug_1 = require("../../common/utils/generateSlug");
const roles_1 = require("../../common/constants/roles");
const product_repository_1 = require("./product.repository");
const product_model_1 = __importDefault(require("./product.model"));
const toNumber = (value, fallback = 0) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
};
const parseJson = (value, fallback) => {
    if (value === undefined || value === null)
        return fallback;
    if (typeof value === "object")
        return value;
    if (typeof value === "string" && value.trim()) {
        try {
            return JSON.parse(value);
        }
        catch (_a) {
            return fallback;
        }
    }
    return fallback;
};
const toStringArray = (value) => {
    if (Array.isArray(value))
        return value.map(String).filter(Boolean);
    if (typeof value === "string") {
        const parsed = parseJson(value, []);
        if (Array.isArray(parsed) && parsed.length)
            return parsed.map(String).filter(Boolean);
        return value.split(",").map((item) => item.trim()).filter(Boolean);
    }
    return [];
};
const normalizeStatus = (value) => {
    const normalized = String(value || "").toUpperCase();
    if (["UNPUBLISHED", "INACTIVE", "DRAFT"].includes(normalized))
        return "Unpublished";
    return "Published";
};
const ensureObjectId = (id, field) => {
    if (!id || !mongoose_1.default.isValidObjectId(id)) {
        throw new appError_1.AppError(`Invalid ${field} id`, 400);
    }
    return new mongoose_1.Types.ObjectId(String(id));
};
const buildSort = (sortParam) => {
    const normalized = String(sortParam || "").toLowerCase().replace(/\s+/g, "_");
    if (["price_asc", "price_low_to_high", "low_to_high"].includes(normalized)) {
        return { priceMin: 1, createdAt: -1, _id: -1 };
    }
    if (["price_desc", "price_high_to_low", "high_to_low"].includes(normalized)) {
        return { priceMin: -1, createdAt: -1, _id: -1 };
    }
    if (["popular", "recommended", "relevance"].includes(normalized)) {
        return { ratingAvg: -1, salesCount: -1, createdAt: -1 };
    }
    return { createdAt: -1, _id: -1 };
};
const buildFilter = (query, role) => {
    const filter = { isDeleted: { $ne: true } };
    const isAdmin = role && (0, roles_1.normalizeRole)(role) === roles_1.Roles.ADMIN;
    if (!(isAdmin && String(query.status || "").toLowerCase() === "all")) {
        filter.status = "Published";
    }
    const search = String(query.search || query.q || query.query || "").trim();
    if (search)
        filter.$text = { $search: search };
    const category = query.category || query.categories;
    if (category && mongoose_1.default.isValidObjectId(String(category))) {
        filter.category = new mongoose_1.Types.ObjectId(String(category));
    }
    const brand = query.brand;
    if (brand && mongoose_1.default.isValidObjectId(String(brand))) {
        filter.brand = new mongoose_1.Types.ObjectId(String(brand));
    }
    const minPrice = Number(query.priceMin || query.minPrice || query.min_price);
    const maxPrice = Number(query.priceMax || query.maxPrice || query.max_price);
    if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
        filter.priceMin = {};
        if (Number.isFinite(minPrice))
            filter.priceMin.$gte = minPrice;
        if (Number.isFinite(maxPrice))
            filter.priceMin.$lte = maxPrice;
    }
    return filter;
};
exports.productService = {
    list(query, role) {
        return __awaiter(this, void 0, void 0, function* () {
            const page = Math.max(parseInt(String(query.page || "1"), 10), 1);
            const limit = Math.min(Math.max(parseInt(String(query.limit || "25"), 10), 1), 100);
            const skip = (page - 1) * limit;
            const filter = buildFilter(query, role);
            const sort = buildSort(query.sort);
            const [products, total] = yield Promise.all([
                product_repository_1.productRepository.list(filter, sort, skip, limit),
                product_repository_1.productRepository.count(filter),
            ]);
            return { products, total, page, perPage: limit, totalPages: Math.ceil(total / limit) };
        });
    },
    listRaw(query, role) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.list(Object.assign(Object.assign({}, query), { limit: query.limit || 100 }), role);
            return result.products;
        });
    },
    search(query, role) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.list(query, role);
        });
    },
    getByIdOrSlug(idOrSlug) {
        return __awaiter(this, void 0, void 0, function* () {
            const product = mongoose_1.default.isValidObjectId(idOrSlug)
                ? yield product_repository_1.productRepository.findById(idOrSlug)
                : yield product_repository_1.productRepository.findBySlug(idOrSlug);
            if (!product)
                throw new appError_1.AppError("Product not found", 404);
            return product;
        });
    },
    create(payload, files, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!payload.name)
                throw new appError_1.AppError("name is required", 400);
            if (!payload.category)
                throw new appError_1.AppError("category is required", 400);
            const seller = payload.seller || userId;
            if (!seller)
                throw new appError_1.AppError("seller is required", 400);
            const uploaded = (files === null || files === void 0 ? void 0 : files.map((file) => `/uploads/${file.filename}`)) || [];
            const images = [...toStringArray(payload.images), ...uploaded];
            const variants = parseJson(payload.variants, []);
            const hasVariants = Array.isArray(variants) && variants.length > 0;
            const product = yield product_repository_1.productRepository.create({
                name: String(payload.name).trim(),
                slug: (0, generateSlug_1.generateSlug)(String(payload.slug || payload.name)),
                description: String(payload.description || ""),
                feature: String(payload.feature || ""),
                brand: payload.brand ? ensureObjectId(payload.brand, "brand") : undefined,
                category: ensureObjectId(payload.category, "category"),
                seller: ensureObjectId(seller, "seller"),
                price: hasVariants ? undefined : toNumber(payload.price, 0),
                compareAtPrice: payload.compareAtPrice ? toNumber(payload.compareAtPrice) : undefined,
                currency: String(payload.currency || "USD").toUpperCase(),
                stock: hasVariants ? undefined : Math.max(0, toNumber(payload.stock, 0)),
                status: normalizeStatus(payload.status),
                tag: toStringArray(payload.tag),
                images,
                productType: String(payload.productType || ""),
                actualPrice: payload.actualPrice ? toNumber(payload.actualPrice) : undefined,
                dealerPrice: payload.dealerPrice ? toNumber(payload.dealerPrice) : undefined,
                attributes: parseJson(payload.attributes, {}),
                variants,
                weight: payload.weight ? toNumber(payload.weight) : undefined,
                isAdult: payload.isAdult === "true" || payload.isAdult === true,
                isHazardous: payload.isHazardous === "true" || payload.isHazardous === true,
                dedupeKey: [
                    String(payload.name).trim().toLowerCase(),
                    String(payload.brand || "").trim().toLowerCase(),
                    String(payload.category),
                ].join("|"),
            });
            return product;
        });
    },
    update(id, payload, files) {
        return __awaiter(this, void 0, void 0, function* () {
            const updates = Object.assign({}, payload);
            if (payload.name !== undefined && payload.slug === undefined) {
                updates.slug = (0, generateSlug_1.generateSlug)(String(payload.name));
            }
            if (payload.slug !== undefined)
                updates.slug = (0, generateSlug_1.generateSlug)(String(payload.slug));
            if (payload.status !== undefined)
                updates.status = normalizeStatus(payload.status);
            if (payload.brand)
                updates.brand = ensureObjectId(payload.brand, "brand");
            if (payload.category)
                updates.category = ensureObjectId(payload.category, "category");
            if (payload.seller)
                updates.seller = ensureObjectId(payload.seller, "seller");
            if (payload.price !== undefined)
                updates.price = toNumber(payload.price);
            if (payload.stock !== undefined)
                updates.stock = Math.max(0, toNumber(payload.stock));
            if (payload.tag !== undefined)
                updates.tag = toStringArray(payload.tag);
            if (payload.attributes !== undefined)
                updates.attributes = parseJson(payload.attributes, {});
            if (payload.variants !== undefined)
                updates.variants = parseJson(payload.variants, []);
            const uploaded = (files === null || files === void 0 ? void 0 : files.map((file) => `/uploads/${file.filename}`)) || [];
            if (uploaded.length || payload.images !== undefined) {
                updates.images = [...toStringArray(payload.images), ...uploaded];
            }
            const product = yield product_repository_1.productRepository.update(id, updates);
            if (!product)
                throw new appError_1.AppError("Product not found.", 404);
            return product;
        });
    },
    remove(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const product = yield product_repository_1.productRepository.softDelete(id);
            if (!product)
                throw new appError_1.AppError("Product not found.", 404);
            return { msg: "Product deleted successfully." };
        });
    },
    removeMany(ids) {
        return __awaiter(this, void 0, void 0, function* () {
            yield product_model_1.default.updateMany({ _id: { $in: ids } }, { isDeleted: true, deletedAt: new Date() });
            return { msg: "Products deleted successfully." };
        });
    },
    recommendations(id) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const product = yield this.getByIdOrSlug(id);
            const related = yield product_model_1.default.find({
                _id: { $ne: product._id },
                category: ((_a = product.category) === null || _a === void 0 ? void 0 : _a._id) || product.category,
                status: "Published",
                isDeleted: { $ne: true },
            })
                .limit(8)
                .lean();
            return { products: related };
        });
    },
};
