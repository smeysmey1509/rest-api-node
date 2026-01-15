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
const Product_1 = __importDefault(require("../../models/Product"));
const Category_1 = __importDefault(require("../../models/Category"));
const User_1 = __importDefault(require("../../models/User"));
const mongoose_1 = require("mongoose");
function buildSort(sortParam) {
    const normalized = (sortParam || "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "_")
        .replace(/-+/g, "_");
    switch (normalized) {
        case "price_asc":
        case "price_low_to_high":
        case "price_low_high":
        case "low_to_high":
            return { priceMin: 1, createdAt: -1, _id: -1 };
        case "price_desc":
        case "price_high_to_low":
        case "price_high_low":
        case "high_to_low":
            return { priceMin: -1, createdAt: -1, _id: -1 };
        case "date_asc":
        case "created_at_asc":
        case "oldest":
            return { createdAt: 1, _id: 1 };
        case "date_desc":
        case "created_at_desc":
        case "newest":
            return { createdAt: -1, _id: -1 };
        case "most_relate":
        case "most_releate":
        case "most_related":
        case "relevance":
        case "relevant":
        case "recommended":
        case "popular":
            return { ratingAvg: -1, salesCount: -1, createdAt: -1, _id: -1 };
        case "sort_by":
        case "default":
        case "":
            return { createdAt: -1, _id: -1 };
        default:
            return { createdAt: -1, _id: -1 };
    }
}
const startOfDay = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
};
const endOfDay = (d) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
};
function resolvePeriod(period) {
    if (!period)
        return {};
    const now = new Date();
    const todayStart = startOfDay(now), todayEnd = endOfDay(now);
    const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
    switch (period) {
        case "today":
            return { from: todayStart, to: todayEnd };
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
        case "this_month":
            return { from: startOfDay(firstOfThisMonth), to: todayEnd };
        case "prev_month":
            return {
                from: startOfDay(firstOfPrevMonth),
                to: endOfDay(endOfPrevMonth),
            };
        default:
            return {};
    }
}
// helpers for category parsing
const toArrayParam = (v) => v == null
    ? []
    : (Array.isArray(v) ? v : String(v).split(","))
        .map((s) => s.trim())
        .filter(Boolean);
const listProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const user = userId ? yield User_1.default.findById(userId).lean() : null;
        const defaultLimit = (_b = user === null || user === void 0 ? void 0 : user.limit) !== null && _b !== void 0 ? _b : 25;
        const limit = Math.max(parseInt(String((_c = req.query.limit) !== null && _c !== void 0 ? _c : "")) || defaultLimit, 1);
        const page = Math.max(parseInt(String((_d = req.query.page) !== null && _d !== void 0 ? _d : "")) || 1, 1);
        const skip = (page - 1) * limit;
        const rawSearch = ((_h = ((_g = (_f = (_e = req.query.search) !== null && _e !== void 0 ? _e : req.query.q) !== null && _f !== void 0 ? _f : req.query.query) !== null && _g !== void 0 ? _g : "")) === null || _h === void 0 ? void 0 : _h.toString()) ||
            "";
        const search = rawSearch.trim();
        const sort = buildSort(String((_j = req.query.sort) !== null && _j !== void 0 ? _j : ""));
        const toNumber = (value) => {
            if (Array.isArray(value))
                value = value[0];
            if (value === null || value === undefined)
                return undefined;
            const num = Number(String(value));
            return Number.isFinite(num) ? num : undefined;
        };
        const rawPriceParam = req.query.price;
        const priceObject = rawPriceParam &&
            !Array.isArray(rawPriceParam) &&
            typeof rawPriceParam === "object"
            ? rawPriceParam
            : {};
        const minPrice = (_p = (_o = (_m = (_l = (_k = toNumber(priceObject.gte)) !== null && _k !== void 0 ? _k : toNumber(priceObject.min)) !== null && _l !== void 0 ? _l : toNumber(priceObject.from)) !== null && _m !== void 0 ? _m : toNumber(req.query.priceMin)) !== null && _o !== void 0 ? _o : toNumber(req.query.minPrice)) !== null && _p !== void 0 ? _p : toNumber(req.query["min_price"]);
        const maxPrice = (_u = (_t = (_s = (_r = (_q = toNumber(priceObject.lte)) !== null && _q !== void 0 ? _q : toNumber(priceObject.max)) !== null && _r !== void 0 ? _r : toNumber(priceObject.to)) !== null && _s !== void 0 ? _s : toNumber(req.query.priceMax)) !== null && _t !== void 0 ? _t : toNumber(req.query.maxPrice)) !== null && _u !== void 0 ? _u : toNumber(req.query["max_price"]);
        // Date published filter
        const hasPublishedAt = !!Product_1.default.schema.path("publishedAt");
        const dateField = hasPublishedAt
            ? "publishedAt"
            : "createdAt";
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
        if (minPrice !== undefined || maxPrice !== undefined) {
            const priceRange = {};
            if (minPrice !== undefined)
                priceRange.$gte = minPrice;
            if (maxPrice !== undefined)
                priceRange.$lte = maxPrice;
            query.priceMin = priceRange;
        }
        if (search) {
            query.$text = { $search: search };
        }
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
                const cats = yield Category_1.default.find({
                    $or: [
                        { categoryId: { $in: keys } },
                        { categoryName: { $in: keys } },
                    ],
                }, { _id: 1 }).lean();
                objectIds.push(...cats.map((c) => c._id));
            }
            query.category = {
                $in: objectIds.length
                    ? objectIds
                    : [new mongoose_1.Types.ObjectId("000000000000000000000000")],
            };
        }
        const shouldSortByTextScore = search && !req.query.sort;
        const projection = shouldSortByTextScore
            ? { dedupeKey: 0, score: { $meta: "textScore" } }
            : { dedupeKey: 0 };
        const sortWithTextScore = shouldSortByTextScore
            ? Object.assign({ score: { $meta: "textScore" } }, sort) : sort;
        const [products, total] = yield Promise.all([
            Product_1.default.find(query)
                .select(projection)
                .populate("category")
                .populate("seller")
                .populate("brand")
                .sort(sortWithTextScore)
                .skip(skip)
                .limit(limit)
                .lean({ virtuals: true }),
            Product_1.default.countDocuments(query),
        ]);
        const totalPages = Math.ceil(total / limit);
        res.status(200).json({
            pagination: {
                total,
                page,
                perPage: limit,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
            products,
        });
    }
    catch (err) {
        console.error("listProducts error:", err);
        res.status(500).json({ error: "Failed to fetch products." });
    }
});
exports.listProducts = listProducts;
