"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewRepository = void 0;
const review_model_1 = __importDefault(require("./review.model"));
exports.reviewRepository = {
    listApprovedByProduct(productId) {
        return review_model_1.default.find({ product: productId, status: "APPROVED" })
            .populate("user", "name")
            .sort({ createdAt: -1 })
            .lean();
    },
    create(payload) {
        return review_model_1.default.create(payload);
    },
    findById(id) {
        return review_model_1.default.findById(id);
    },
    delete(id) {
        return review_model_1.default.findByIdAndDelete(id);
    },
};
