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
exports.listCategories = void 0;
const Category_1 = __importDefault(require("../../../models/Category"));
const listCategories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const q = String((_a = req.query.q) !== null && _a !== void 0 ? _a : "").trim();
        const page = Math.max(parseInt(String((_b = req.query.page) !== null && _b !== void 0 ? _b : "1"), 10), 1);
        const limit = Math.min(Math.max(parseInt(String((_c = req.query.limit) !== null && _c !== void 0 ? _c : "25"), 10), 1), 100);
        const skip = (page - 1) * limit;
        const sortStr = String((_d = req.query.sort) !== null && _d !== void 0 ? _d : "categoryName:1");
        const sort = {};
        sortStr.split(",").forEach((pair) => {
            const [field, dir] = pair.split(":");
            if (field)
                sort[field] = dir === "-1" ? -1 : 1;
        });
        const filter = {};
        if (q) {
            filter.$or = [
                { categoryName: { $regex: q, $options: "i" } },
                { categoryId: { $regex: q, $options: "i" } },
                { description: { $regex: q, $options: "i" } },
            ];
        }
        const [items, total] = yield Promise.all([
            Category_1.default.aggregate([
                { $match: filter },
                {
                    $lookup: {
                        from: "products",
                        let: { catId: "$_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ["$category", "$$catId"] },
                                    isDeleted: { $ne: true },
                                },
                            },
                            {
                                $project: {
                                    stock: { $ifNull: ["$stock", 0] },
                                    price: { $ifNull: ["$priceMin", "$price"] },
                                    salesCount: { $ifNull: ["$salesCount", 0] },
                                },
                            },
                            {
                                $group: {
                                    _id: null,
                                    productCount: { $sum: 1 },
                                    totalStock: { $sum: "$stock" },
                                    avgPrice: { $avg: "$price" },
                                    totalSales: { $sum: "$salesCount" },
                                },
                            },
                        ],
                        as: "stats",
                    },
                },
                {
                    $addFields: {
                        productCount: { $ifNull: [{ $first: "$stats.productCount" }, 0] },
                        totalStock: { $ifNull: [{ $first: "$stats.totalStock" }, 0] },
                        avgPrice: { $ifNull: [{ $first: "$stats.avgPrice" }, 0] },
                        totalSales: { $ifNull: [{ $first: "$stats.totalSales" }, 0] },
                    },
                },
                { $project: { stats: 0 } },
                { $sort: sort },
                { $skip: skip },
                { $limit: limit },
            ]),
            Category_1.default.countDocuments(filter),
        ]);
        res.status(200).json({
            categories: items,
            total,
            page,
            perPage: limit,
            totalPages: Math.ceil(total / limit),
        });
    }
    catch (err) {
        console.error("listCategories error:", err);
        res.status(500).json({ error: "Failed to fetch categories" });
    }
});
exports.listCategories = listCategories;
