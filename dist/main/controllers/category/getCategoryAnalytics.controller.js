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
exports.getCategoryAnalytics = void 0;
const Product_1 = __importDefault(require("../../../models/Product"));
const getCategoryAnalytics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const analytics = yield Product_1.default.aggregate([
            {
                $group: {
                    _id: "$category",
                    productCount: { $sum: 1 },
                    totalStock: { $sum: "$stock" },
                    avgPrice: { $avg: "$priceMin" },
                    totalSales: { $sum: "$salesCount" },
                },
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "_id",
                    foreignField: "_id",
                    as: "category",
                },
            },
            { $unwind: "$category" },
            {
                $project: {
                    _id: 0,
                    categoryId: "$category.categoryId",
                    categoryName: "$category.categoryName",
                    productCount: 1,
                    totalStock: 1,
                    avgPrice: { $round: ["$avgPrice", 2] },
                    totalSales: 1,
                },
            },
            { $sort: { totalSales: -1 } },
        ]);
        res.status(200).json(analytics);
    }
    catch (err) {
        console.error("Error fetching category analytics:", err);
        res.status(500).json({ error: "Failed to fetch analytics" });
    }
});
exports.getCategoryAnalytics = getCategoryAnalytics;
