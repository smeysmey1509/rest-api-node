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
exports.recomputeAllRatings = recomputeAllRatings;
// one-off script or admin endpoint
const review_model_1 = __importDefault(require("../modules/reviews/review.model"));
const product_model_1 = __importDefault(require("../modules/products/product.model"));
const mongoose_1 = __importDefault(require("mongoose"));
function recomputeAllRatings(productId) {
    return __awaiter(this, void 0, void 0, function* () {
        const agg = yield review_model_1.default.aggregate([
            { $match: { product: new mongoose_1.default.Types.ObjectId(productId) } },
            {
                $group: {
                    _id: "$product",
                    avg: { $avg: "$rating" },
                    cnt: { $sum: 1 },
                },
            },
        ]);
        const row = agg[0];
        const avg = row ? Number(row.avg.toFixed(2)) : 0;
        const cnt = row ? row.cnt : 0;
        yield product_model_1.default.updateOne({ _id: productId }, { $set: { ratingAvg: avg, ratingCount: cnt } });
    });
}
