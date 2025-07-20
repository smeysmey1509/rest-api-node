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
    var _a;
    const query = ((_a = req.query.query) === null || _a === void 0 ? void 0 : _a.toString().trim()) || "";
    const cacheKey = `products:search:${query}`;
    try {
        // 1. Check Redis cache
        const cached = yield redisClient_1.default.get(cacheKey);
        if (cached) {
            res.status(200).json(JSON.parse(cached));
            return;
        }
        const results = yield Product_1.default.find({ $text: { $search: query } }, { score: { $meta: "textScore" } }).populate("category", "name").populate("seller", "name email");
        const response = { total: results.length, results };
        yield redisClient_1.default.setEx(cacheKey, 600, JSON.stringify(response));
        res.status(200).json({ products: results, total: results.length });
    }
    catch (err) {
        console.error("Search error:", err);
        res.status(500).json({ error: "Search failed." });
        return;
    }
});
exports.searchProducts = searchProducts;
