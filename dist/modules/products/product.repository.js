"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.productRepository = void 0;
const product_model_1 = __importDefault(require("./product.model"));
exports.productRepository = {
    list(filter, sort, skip, limit) {
        return product_model_1.default.find(filter)
            .populate("brand", "name slug isActive")
            .populate("category", "categoryId categoryName productCount")
            .populate("seller", "name email")
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean();
    },
    count(filter) {
        return product_model_1.default.countDocuments(filter);
    },
    findById(id) {
        return product_model_1.default.findById(id).populate("category").populate("brand").populate("seller");
    },
    findBySlug(slug) {
        return product_model_1.default.findOne({ slug }).populate("category").populate("brand").populate("seller");
    },
    create(payload) {
        return product_model_1.default.create(payload);
    },
    update(id, payload) {
        return product_model_1.default.findByIdAndUpdate(id, payload, {
            new: true,
            runValidators: true,
        }).populate("category").populate("brand").populate("seller");
    },
    softDelete(id) {
        return product_model_1.default.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date() }, { new: true });
    },
};
