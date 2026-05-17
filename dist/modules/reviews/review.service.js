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
exports.reviewService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const product_model_1 = __importDefault(require("../products/product.model"));
const order_model_1 = __importDefault(require("../orders/order.model"));
const review_model_1 = __importDefault(require("./review.model"));
const appError_1 = require("../../common/utils/appError");
const review_repository_1 = require("./review.repository");
const paidStatuses = [
    "PAID",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "paid",
    "processing",
    "shipped",
    "delivered",
];
const recomputeProductRating = (productId) => __awaiter(void 0, void 0, void 0, function* () {
    const rows = yield review_model_1.default.aggregate([
        { $match: { product: new mongoose_1.default.Types.ObjectId(productId), status: "APPROVED" } },
        { $group: { _id: "$product", avg: { $avg: "$rating" }, count: { $sum: 1 }, sum: { $sum: "$rating" } } },
    ]);
    const stats = rows[0] || { avg: 0, count: 0, sum: 0 };
    yield product_model_1.default.updateOne({ _id: productId }, {
        ratingAvg: Number((stats.avg || 0).toFixed(2)),
        ratingCount: stats.count || 0,
        ratingSum: stats.sum || 0,
    });
});
exports.reviewService = {
    listApproved(productId) {
        return review_repository_1.reviewRepository.listApprovedByProduct(productId);
    },
    create(userId, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const productId = String(payload.productId || payload.product || "");
            if (!productId || !mongoose_1.default.isValidObjectId(productId)) {
                throw new appError_1.AppError("Valid productId is required", 400);
            }
            const rating = Number(payload.rating);
            if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
                throw new appError_1.AppError("rating must be between 1 and 5", 400);
            }
            const product = yield product_model_1.default.findById(productId).select("_id");
            if (!product)
                throw new appError_1.AppError("Product not found", 404);
            const purchased = yield order_model_1.default.exists({
                user: userId,
                "items.product": productId,
                status: { $in: paidStatuses },
            });
            if (!purchased) {
                throw new appError_1.AppError("Only purchased products can be reviewed.", 403);
            }
            try {
                const review = yield review_repository_1.reviewRepository.create({
                    product: productId,
                    user: userId,
                    rating,
                    title: typeof payload.title === "string" ? payload.title : undefined,
                    body: typeof payload.body === "string"
                        ? payload.body
                        : typeof payload.comment === "string"
                            ? payload.comment
                            : undefined,
                    comment: typeof payload.comment === "string" ? payload.comment : undefined,
                    isVerifiedPurchase: true,
                    status: "PENDING",
                });
                return { msg: "Review created", review };
            }
            catch (err) {
                if ((err === null || err === void 0 ? void 0 : err.code) === 11000)
                    throw new appError_1.AppError("You already reviewed this product", 409);
                throw err;
            }
        });
    },
    approve(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const review = yield review_repository_1.reviewRepository.findById(id);
            if (!review)
                throw new appError_1.AppError("Review not found", 404);
            review.status = "APPROVED";
            yield review.save();
            yield recomputeProductRating(String(review.product));
            return review;
        });
    },
    remove(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const review = yield review_repository_1.reviewRepository.delete(id);
            if (!review)
                throw new appError_1.AppError("Review not found", 404);
            yield recomputeProductRating(String(review.product));
            return { msg: "Review deleted successfully." };
        });
    },
};
