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
exports.upsertReview = upsertReview;
exports.deleteReview = deleteReview;
// services/reviews.ts
const Review_1 = __importDefault(require("../../models/Review"));
const Product_1 = __importDefault(require("../../models/Product"));
const mongoose_1 = __importDefault(require("mongoose"));
// Create or update a review
function upsertReview(_a) {
    return __awaiter(this, arguments, void 0, function* ({ userId, productId, rating, title, comment, orderItemId }) {
        const session = yield mongoose_1.default.startSession();
        session.startTransaction();
        try {
            const existing = yield Review_1.default.findOne({ user: userId, product: productId }).session(session);
            if (!existing) {
                yield Review_1.default.create([{
                        user: userId,
                        product: productId,
                        orderItem: orderItemId,
                        isVerifiedPurchase: !!orderItemId, // or check order status
                        rating, title, comment,
                    }], { session });
                yield Product_1.default.updateOne({ _id: productId }, { $inc: { ratingCount: 1, ratingSum: rating } }, { session });
            }
            else {
                // adjust delta
                const delta = rating - existing.rating;
                existing.set({ rating, title, comment });
                yield existing.save({ session });
                if (delta !== 0) {
                    yield Product_1.default.updateOne({ _id: productId }, { $inc: { ratingSum: delta } }, { session });
                }
            }
            // recompute avg from sum/count in one query
            yield Product_1.default.updateOne({ _id: productId }, [{ $set: { ratingAvg: { $cond: [{ $gt: ["$ratingCount", 0] }, { $divide: ["$ratingSum", "$ratingCount"] }, 0] } } }], { session });
            yield session.commitTransaction();
        }
        catch (e) {
            yield session.abortTransaction();
            throw e;
        }
        finally {
            session.endSession();
        }
    });
}
// Delete review
function deleteReview(_a) {
    return __awaiter(this, arguments, void 0, function* ({ userId, productId }) {
        const session = yield mongoose_1.default.startSession();
        session.startTransaction();
        try {
            const rev = yield Review_1.default.findOneAndDelete({ user: userId, product: productId }, { session });
            if (rev) {
                yield Product_1.default.updateOne({ _id: productId }, { $inc: { ratingCount: -1, ratingSum: -rev.rating } }, { session });
                yield Product_1.default.updateOne({ _id: productId }, [{ $set: { ratingAvg: { $cond: [{ $gt: ["$ratingCount", 0] }, { $divide: ["$ratingSum", "$ratingCount"] }, 0] } } }], { session });
            }
            yield session.commitTransaction();
        }
        catch (e) {
            yield session.abortTransaction();
            throw e;
        }
        finally {
            session.endSession();
        }
    });
}
