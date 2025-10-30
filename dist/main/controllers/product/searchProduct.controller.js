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
exports.searchProducts = void 0;
const Product_1 = __importDefault(require("../../../models/Product"));
const redisClient_1 = __importDefault(require("../../utils/redisClient"));
const searchProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const query = ((_a = req.query.query) === null || _a === void 0 ? void 0 : _a.toString().trim()) || "";
    const limit = Math.max(parseInt(String((_b = req.query.limit) !== null && _b !== void 0 ? _b : ""), 10) || 10, 1);
    const page = Math.max(parseInt(String((_c = req.query.page) !== null && _c !== void 0 ? _c : ""), 10) || 1, 1);
    const skip = (page - 1) * limit;
    const cacheKey = `products:search:${query}:page=${page}:limit=${limit}`;
    try {
        // 1. Check Redis cache
        const cached = yield redisClient_1.default.get(cacheKey);
        if (cached) {
            res.status(200).json(JSON.parse(cached));
            return;
        }
        if (!query) {
            const emptyResponse = {
                pagination: {
                    total: 0,
                    page,
                    perPage: limit,
                    totalPages: 0,
                    hasNextPage: false,
                    hasPrevPage: page > 1,
                },
                products: [],
            };
            yield redisClient_1.default.setEx(cacheKey, 600, JSON.stringify(emptyResponse));
            res.status(200).json(emptyResponse);
            return;
        }
        const filter = { $text: { $search: query } };
        const [results, total] = yield Promise.all([
            Product_1.default.find(filter, { score: { $meta: "textScore" } })
                .populate("category")
                .populate("seller")
                .sort({ score: { $meta: "textScore" } })
                .skip(skip)
                .limit(limit),
            Product_1.default.countDocuments(filter),
        ]);
        const totalPages = Math.ceil(total / limit);
        const response = {
            pagination: {
                total,
                page,
                perPage: limit,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
            products: results,
        };
        yield redisClient_1.default.setEx(cacheKey, 600, JSON.stringify(response));
        res.status(200).json(response);
    }
    catch (err) {
        console.error("Search error:", err);
        res.status(500).json({ error: "Search failed." });
        return;
    }
});
exports.searchProducts = searchProducts;
