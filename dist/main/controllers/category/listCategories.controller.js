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
    var _a, _b;
    try {
        const q = String((_a = req.query.q) !== null && _a !== void 0 ? _a : "").trim();
        const page = Math.max(parseInt(String(req.query.page || "1"), 10), 1);
        const limit = Math.min(Math.max(parseInt(String(req.query.limit || "25"), 10), 1), 100);
        const skip = (page - 1) * limit;
        // Sorting: ?sort=createdAt:-1 or ?sort=categoryName:1,totalSales:-1
        const sortStr = String((_b = req.query.sort) !== null && _b !== void 0 ? _b : "createdAt:-1");
        const sort = {};
        sortStr.split(",").forEach(pair => {
            const [field, dir] = pair.split(":");
            if (field)
                sort[field] = (dir === "-1" ? -1 : 1);
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
            Category_1.default.find(filter).sort(sort).skip(skip).limit(limit).lean(),
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
