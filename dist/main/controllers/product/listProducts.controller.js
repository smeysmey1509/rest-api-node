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
exports.listProducts = void 0;
const Product_1 = __importDefault(require("../../../models/Product"));
const User_1 = __importDefault(require("../../../models/User"));
function buildSort(sortParam) {
    switch ((sortParam || "").toLowerCase()) {
        case "price_asc": return { priceMin: 1, createdAt: -1, _id: -1 };
        case "price_desc": return { priceMin: -1, createdAt: -1, _id: -1 };
        case "date_asc": return { createdAt: 1, _id: 1 };
        case "date_desc": return { createdAt: -1, _id: -1 };
        case "date":
        default: return { createdAt: -1, _id: -1 };
    }
}
function parseObjectIds(input) {
    if (!input)
        return [];
    if (Array.isArray(input))
        return input.map(String).filter(id => id.trim());
    if (typeof input === "string")
        return input.split(",").map(id => id.trim()).filter(id => id);
    return [];
}
const listProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const user = userId ? yield User_1.default.findById(userId).lean() : null;
        const defaultLimit = (_b = user === null || user === void 0 ? void 0 : user.limit) !== null && _b !== void 0 ? _b : 25;
        const limit = Math.max(parseInt(String((_c = req.query.limit) !== null && _c !== void 0 ? _c : "")) || defaultLimit, 1);
        const page = Math.max(parseInt(String((_d = req.query.page) !== null && _d !== void 0 ? _d : "")) || 1, 1);
        const skip = (page - 1) * limit;
        const sort = buildSort(String((_e = req.query.sort) !== null && _e !== void 0 ? _e : ""));
        const categoryIds = parseObjectIds(req.query.category) || parseObjectIds(req.query.categories);
        const query = { isDeleted: { $ne: true } };
        if (categoryIds.length)
            query.category = { $in: categoryIds.map(id => id) };
        const products = yield Product_1.default.find(query)
            .select("-dedupeKey")
            .populate("category", "name")
            .populate("seller", "name email")
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean({ virtuals: true });
        // return products only
        res.status(200).json(products);
    }
    catch (err) {
        console.error("listProducts error:", err);
        res.status(500).json({ error: "Failed to fetch products." });
    }
});
exports.listProducts = listProducts;
