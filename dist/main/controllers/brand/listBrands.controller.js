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
exports.listBrands = void 0;
const Brand_1 = __importDefault(require("../../../models/Brand"));
function parseSort(input) {
    const sort = {};
    (input || "name:1").split(",").forEach(pair => {
        const [field, dir] = pair.split(":");
        if (field)
            sort[field] = dir === "-1" ? -1 : 1;
    });
    return sort;
}
const listBrands = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const q = String((_a = req.query.q) !== null && _a !== void 0 ? _a : "").trim();
        const page = Math.max(parseInt(String((_b = req.query.page) !== null && _b !== void 0 ? _b : "1"), 10), 1);
        const limit = Math.min(Math.max(parseInt(String((_c = req.query.limit) !== null && _c !== void 0 ? _c : "25"), 10), 1), 100);
        const skip = (page - 1) * limit;
        const sort = parseSort(String((_d = req.query.sort) !== null && _d !== void 0 ? _d : "name:1"));
        const filter = {};
        if (q) {
            filter.$or = [
                { name: { $regex: q, $options: "i" } },
                { slug: { $regex: q, $options: "i" } },
            ];
        }
        if (typeof req.query.isActive !== "undefined") {
            const v = String(req.query.isActive);
            filter.isActive = v === "1" || v.toLowerCase() === "true";
        }
        const [items, total] = yield Promise.all([
            Brand_1.default.find(filter).sort(sort).skip(skip).limit(limit).lean(),
            Brand_1.default.countDocuments(filter),
        ]);
        res.status(200).json({
            brands: items,
            total,
            page,
            perPage: limit,
            totalPages: Math.ceil(total / limit),
        });
    }
    catch (err) {
        console.error("listBrands error:", err);
        res.status(500).json({ error: "Failed to fetch brands" });
    }
});
exports.listBrands = listBrands;
