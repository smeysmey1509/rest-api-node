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
const Category_1 = __importDefault(require("../../../models/Category"));
const User_1 = __importDefault(require("../../../models/User"));
const mongoose_1 = require("mongoose");
function buildSort(sortParam) {
    switch ((sortParam || "").toLowerCase()) {
        case "price_asc": return { priceMin: 1, createdAt: -1, _id: -1 };
        case "price_desc": return { priceMin: -1, createdAt: -1, _id: -1 };
        case "date_asc": return { createdAt: 1, _id: 1 };
        case "date_desc": return { createdAt: -1, _id: -1 };
        default: return { createdAt: -1, _id: -1 };
    }
}
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
function resolvePeriod(period) {
    if (!period)
        return {};
    const now = new Date();
    const todayStart = startOfDay(now), todayEnd = endOfDay(now);
    const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
    switch (period) {
        case "today": return { from: todayStart, to: todayEnd };
        case "yesterday": {
            const y = new Date(now);
            y.setDate(now.getDate() - 1);
            return { from: startOfDay(y), to: endOfDay(y) };
        }
        case "last7d": {
            const f = new Date(now);
            f.setDate(now.getDate() - 6);
            return { from: startOfDay(f), to: todayEnd };
        }
        case "last30d": {
            const f = new Date(now);
            f.setDate(now.getDate() - 29);
            return { from: startOfDay(f), to: todayEnd };
        }
        case "this_month": return { from: startOfDay(firstOfThisMonth), to: todayEnd };
        case "prev_month": return { from: startOfDay(firstOfPrevMonth), to: endOfDay(endOfPrevMonth) };
        default: return {};
    }
}
// helpers for category parsing
const toArrayParam = (v) => v == null ? [] : (Array.isArray(v) ? v : String(v).split(",")).map(s => s.trim()).filter(Boolean);
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
        // Date published filter
        const hasPublishedAt = !!Product_1.default.schema.path("publishedAt");
        const dateField = hasPublishedAt ? "publishedAt" : "createdAt";
        const { publishedOn, publishedFrom, publishedTo, period } = req.query;
        const range = {};
        if (publishedOn) {
            const d = new Date(publishedOn);
            if (!isNaN(d.getTime())) {
                range.$gte = startOfDay(d);
                range.$lte = endOfDay(d);
            }
        }
        else {
            if (publishedFrom) {
                const f = new Date(publishedFrom);
                if (!isNaN(f.getTime()))
                    range.$gte = startOfDay(f);
            }
            if (publishedTo) {
                const t = new Date(publishedTo);
                if (!isNaN(t.getTime()))
                    range.$lte = endOfDay(t);
            }
            const p = resolvePeriod(period);
            if (p.from)
                range.$gte = p.from;
            if (p.to)
                range.$lte = p.to;
        }
        const query = { isDeleted: { $ne: true } };
        if (range.$gte || range.$lte)
            query[dateField] = range;
        const categoryParams = [
            ...toArrayParam(req.query.category),
            ...toArrayParam(req.query.categories),
        ];
        if (categoryParams.length) {
            const objectIds = [];
            const keys = [];
            for (const token of categoryParams) {
                if (mongoose_1.Types.ObjectId.isValid(token))
                    objectIds.push(new mongoose_1.Types.ObjectId(token));
                else
                    keys.push(token);
            }
            if (keys.length) {
                const cats = yield Category_1.default.find({ $or: [{ categoryId: { $in: keys } }, { categoryName: { $in: keys } }] }, { _id: 1 }).lean();
                objectIds.push(...cats.map(c => c._id));
            }
            query.category = { $in: objectIds.length ? objectIds : [new mongoose_1.Types.ObjectId("000000000000000000000000")] };
        }
        const products = yield Product_1.default.find(query)
            .select("-dedupeKey")
            .populate("category", "categoryId categoryName productCount")
            .populate("seller", "name email")
            .populate("brand", "name slug isActive")
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean({ virtuals: true });
        res.status(200).json(products);
    }
    catch (err) {
        console.error("listProducts error:", err);
        res.status(500).json({ error: "Failed to fetch products." });
    }
});
exports.listProducts = listProducts;
