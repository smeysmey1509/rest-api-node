"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// models/Review.ts
const mongoose_1 = require("mongoose");
const ReviewSchema = new mongoose_1.Schema({
    product: { type: mongoose_1.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    orderItem: { type: mongoose_1.Schema.Types.ObjectId, ref: "OrderItem" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, maxlength: 140 },
    comment: { type: String, trim: true, maxlength: 10000 },
    photos: { type: [String], default: [] },
    isVerifiedPurchase: { type: Boolean, default: false },
    helpfulCount: { type: Number, default: 0 },
    reportedCount: { type: Number, default: 0 },
}, { timestamps: true });
// 1 review per (user, product). If you allow updates, this is perfect.
ReviewSchema.index({ product: 1, user: 1 }, { unique: true });
// (Optional) speed up store pages: star histograms
ReviewSchema.index({ product: 1, rating: 1 });
exports.default = (0, mongoose_1.model)("Review", ReviewSchema);
