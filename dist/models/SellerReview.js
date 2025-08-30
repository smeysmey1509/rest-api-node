"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// models/SellerReview.ts
const mongoose_1 = require("mongoose");
const SellerReviewSchema = new mongoose_1.Schema({
    seller: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    orderId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 5000 },
}, { timestamps: true });
SellerReviewSchema.index({ seller: 1, user: 1 }, { unique: true });
exports.default = (0, mongoose_1.model)("SellerReview", SellerReviewSchema);
