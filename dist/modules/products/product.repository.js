"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.productRepository = void 0;
const product_model_1 = __importDefault(require("./product.model"));
const productListSelect = [
    "name",
    "productCode",
    "slug",
    "images",
    "primaryImageIndex",
    "price",
    "priceMin",
    "priceMax",
    "compareAtPrice",
    "currency",
    "stock",
    "status",
    "ratingAvg",
    "ratingCount",
    "salesCount",
    "category",
    "categoryId",
    "brand",
    "brandId",
    "seller",
    "createdBy",
    "productType",
    "trackingType",
    "createdAt",
    "updatedAt",
].join(" ");
const productDetailSelect = "-dedupeKey";
exports.productRepository = {
    list(filter, sort, skip, limit, options = {}) {
        const query = product_model_1.default.find(filter)
            .select(productListSelect)
            .sort(sort)
            .skip(skip)
            .limit(limit);
        if (options.populate) {
            query
                .populate("brand", "name slug isActive")
                .populate("brandId", "name slug isActive")
                .populate("category", "categoryId categoryName productCount");
            query.populate("categoryId", "categoryId categoryName productCount");
        }
        return query.lean({ virtuals: true });
    },
    count(filter) {
        return product_model_1.default.countDocuments(filter);
    },
    findById(id) {
        return product_model_1.default.findById(id)
            .select(productDetailSelect)
            .populate("category")
            .populate("categoryId")
            .populate("brand")
            .populate("brandId")
            .populate("seller", "name email role status")
            .populate("createdBy", "name email role status")
            .lean({ virtuals: true });
    },
    findBySlug(slug) {
        return product_model_1.default.findOne({ slug })
            .select(productDetailSelect)
            .populate("category")
            .populate("categoryId")
            .populate("brand")
            .populate("brandId")
            .populate("seller", "name email role status")
            .populate("createdBy", "name email role status")
            .lean({ virtuals: true });
    },
    create(payload) {
        return product_model_1.default.create(payload);
    },
    update(id, payload) {
        return product_model_1.default.findByIdAndUpdate(id, payload, {
            new: true,
            runValidators: true,
        })
            .select(productDetailSelect)
            .populate("category")
            .populate("categoryId")
            .populate("brand")
            .populate("brandId")
            .populate("seller", "name email role status");
    },
    softDelete(id) {
        return product_model_1.default.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date() }, { new: true }).select("_id isDeleted deletedAt");
    },
};
