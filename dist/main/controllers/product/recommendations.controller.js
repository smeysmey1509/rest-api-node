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
exports.getProductRecommendations = void 0;
const mongoose_1 = require("mongoose");
const Product_1 = __importDefault(require("../../../models/Product"));
const Wishlist_1 = __importDefault(require("../../../models/Wishlist"));
const Cart_1 = __importDefault(require("../../../models/Cart"));
const DEFAULT_LIMIT = 8;
const BASE_PRODUCT_FILTER = {
    isDeleted: { $ne: true },
    status: { $ne: "Unpublished" },
};
const leanPopulate = (query) => query
    .select("-dedupeKey")
    .populate("category")
    .populate("brand")
    .populate("seller")
    .lean({ virtuals: true })
    .exec();
const toObjectId = (value) => {
    if (!value)
        return null;
    if (value instanceof mongoose_1.Types.ObjectId)
        return value;
    if (typeof value === "string" && mongoose_1.Types.ObjectId.isValid(value)) {
        return new mongoose_1.Types.ObjectId(value);
    }
    if (typeof value === "object" && "_id" in value) {
        return toObjectId(value._id);
    }
    return null;
};
const orderByIds = (docs, ids) => {
    if (!ids.length)
        return docs;
    const map = new Map();
    for (const doc of docs) {
        map.set(String(doc._id), doc);
    }
    return ids
        .map((id) => map.get(String(id)))
        .filter((doc) => Boolean(doc));
};
const normalizeLimit = (limit) => {
    const numeric = Number(limit);
    if (Number.isFinite(numeric) && numeric > 0 && numeric <= 50) {
        return Math.floor(numeric);
    }
    return DEFAULT_LIMIT;
};
const toStringArray = (value) => {
    if (!value)
        return [];
    if (Array.isArray(value)) {
        return value
            .map((item) => typeof item === "string" ? item.trim() : String(item !== null && item !== void 0 ? item : "").trim())
            .filter((item) => item.length > 0);
    }
    if (typeof value === "string") {
        return value
            .split(",")
            .map((item) => item.trim())
            .filter((item) => item.length > 0);
    }
    return [];
};
const uniqueStrings = (values) => {
    const seen = new Set();
    const result = [];
    for (const raw of values) {
        if (!raw)
            continue;
        const value = raw.trim();
        if (!value)
            continue;
        const key = value.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            result.push(value);
        }
    }
    return result;
};
const toOptionalString = (value) => {
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length ? trimmed : null;
    }
    return null;
};
const toOptionalStringArray = (value) => {
    if (!value)
        return [];
    if (Array.isArray(value)) {
        return value
            .map((item) => (typeof item === "string" ? item.trim() : null))
            .filter((item) => Boolean(item && item.length));
    }
    return [];
};
const buildAffinityClauses = (terms) => {
    if (!terms.length)
        return [];
    return [
        { tag: { $in: terms } },
        { "seo.keywords": { $in: terms } },
    ];
};
const collectObjectIds = (values) => values
    .map((value) => toObjectId(value))
    .filter((value) => Boolean(value));
const gatherProducts = (limit_1, baseFilter_1, strategies_1, sort_1, ...args_1) => __awaiter(void 0, [limit_1, baseFilter_1, strategies_1, sort_1, ...args_1], void 0, function* (limit, baseFilter, strategies, sort, seed = [], extraExclusions = []) {
    if (limit <= 0)
        return [];
    const results = [...seed];
    const seenIds = new Set(seed.map((item) => String(item === null || item === void 0 ? void 0 : item._id)));
    const excludeIds = [
        ...extraExclusions,
        ...collectObjectIds(seed.map((item) => item === null || item === void 0 ? void 0 : item._id)),
    ];
    for (const strategy of strategies) {
        if (!strategy || results.length >= limit) {
            if (results.length >= limit)
                break;
            continue;
        }
        const remaining = limit - results.length;
        if (remaining <= 0)
            break;
        let filter = Object.assign(Object.assign({}, baseFilter), strategy);
        if (excludeIds.length) {
            filter = withIdCondition(filter, { $nin: excludeIds });
        }
        const docs = yield leanPopulate(Product_1.default.find(filter)
            .sort(sort)
            .limit(remaining));
        for (const doc of docs) {
            const id = String(doc === null || doc === void 0 ? void 0 : doc._id);
            if (!id || seenIds.has(id))
                continue;
            seenIds.add(id);
            results.push(doc);
            const objectId = toObjectId(doc === null || doc === void 0 ? void 0 : doc._id);
            if (objectId) {
                excludeIds.push(objectId);
            }
            if (results.length >= limit) {
                break;
            }
        }
    }
    return results.slice(0, limit);
});
const getCollectionContext = (product) => {
    if (!product) {
        return { collectionId: null, groupKeys: [] };
    }
    const rawGroupCandidates = [
        toOptionalString(product.groupId),
        toOptionalString(product.productGroupId),
        toOptionalString(product.variantGroupId),
        toOptionalString(product.collectionHandle),
        ...toOptionalStringArray(product.groupIds),
        ...toOptionalStringArray(product.collectionHandles),
    ].filter((value) => Boolean(value));
    return {
        collectionId: toObjectId(product.productCollectionId),
        groupKeys: uniqueStrings(rawGroupCandidates),
    };
};
const withIdCondition = (filter, condition) => {
    const current = filter._id && typeof filter._id === "object" && !Array.isArray(filter._id)
        ? filter._id
        : {};
    return Object.assign(Object.assign({}, filter), { _id: Object.assign(Object.assign({}, current), condition) });
};
const getProductRecommendations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const limit = normalizeLimit(req.query.limit);
        const paramId = (_a = req.params) === null || _a === void 0 ? void 0 : _a.id;
        const queryId = req.query.productId;
        const rawId = (_b = paramId !== null && paramId !== void 0 ? paramId : queryId) !== null && _b !== void 0 ? _b : null;
        let productId = null;
        if (rawId && mongoose_1.Types.ObjectId.isValid(rawId)) {
            productId = new mongoose_1.Types.ObjectId(rawId);
        }
        const requestedTags = toStringArray(req.query.tags);
        const requestedKeywords = toStringArray(req.query.keywords);
        const product = productId
            ? yield leanPopulate(Product_1.default.findOne(Object.assign({ _id: productId }, BASE_PRODUCT_FILTER)))
            : null;
        if (productId && !product) {
            res.status(404).json({ error: "Product not found." });
            return;
        }
        const categoryId = product ? toObjectId(product.category) : null;
        const brandId = product ? toObjectId(product.brand) : null;
        const productTags = product && Array.isArray(product.tag)
            ? product.tag.filter((value) => typeof value === "string" && value.length > 0)
            : [];
        const productKeywords = product && Array.isArray((_c = product === null || product === void 0 ? void 0 : product.seo) === null || _c === void 0 ? void 0 : _c.keywords)
            ? product.seo.keywords.filter((value) => typeof value === "string" && value.length > 0)
            : [];
        const { collectionId, groupKeys } = getCollectionContext(product);
        const affinityTerms = uniqueStrings([
            ...productTags,
            ...productKeywords,
            ...requestedTags,
            ...requestedKeywords,
        ]);
        const affinityClauses = buildAffinityClauses(affinityTerms);
        const baseFilter = Object.assign({}, BASE_PRODUCT_FILTER);
        if (productId) {
            baseFilter._id = { $ne: productId };
        }
        const relatedStrategies = [
            collectionId ? { productCollectionId: collectionId } : null,
            groupKeys.length ? { groupId: { $in: groupKeys } } : null,
            brandId && affinityClauses.length
                ? { brand: brandId, $or: affinityClauses }
                : null,
            categoryId && affinityClauses.length
                ? { category: categoryId, $or: affinityClauses }
                : null,
            brandId ? { brand: brandId } : null,
            categoryId ? { category: categoryId } : null,
            affinityClauses.length ? { $or: affinityClauses } : null,
            {},
        ];
        const featuredStrategies = [
            collectionId
                ? { isFeatured: true, productCollectionId: collectionId }
                : null,
            groupKeys.length
                ? { isFeatured: true, groupId: { $in: groupKeys } }
                : null,
            brandId ? { isFeatured: true, brand: brandId } : null,
            categoryId ? { isFeatured: true, category: categoryId } : null,
            affinityClauses.length
                ? { isFeatured: true, $or: affinityClauses }
                : null,
            { isFeatured: true },
            {},
        ];
        const relatedProducts = yield gatherProducts(limit, baseFilter, relatedStrategies, { salesCount: -1, ratingAvg: -1, createdAt: -1 });
        const featuredProducts = yield gatherProducts(limit, baseFilter, featuredStrategies, { createdAt: -1 });
        const newArrivalsPromise = leanPopulate(Product_1.default.find(baseFilter)
            .sort({ createdAt: -1 })
            .limit(limit));
        const trendingFilter = Object.assign(Object.assign({}, baseFilter), { $or: [{ isTrending: true }, { salesCount: { $gt: 0 } }] });
        const trendingProductsPromise = leanPopulate(Product_1.default.find(trendingFilter)
            .sort({ isTrending: -1, salesCount: -1, updatedAt: -1 })
            .limit(limit));
        const similarQuery = Object.assign({}, baseFilter);
        const similarOr = [];
        if (collectionId) {
            similarOr.push({ productCollectionId: collectionId });
        }
        if (groupKeys.length) {
            similarOr.push(...groupKeys.map((key) => ({ groupId: key })));
        }
        if (!collectionId && !groupKeys.length && affinityTerms.length) {
            similarOr.push({ tag: { $in: affinityTerms } });
            similarOr.push({ "seo.keywords": { $in: affinityTerms } });
        }
        if (!collectionId && !groupKeys.length && !affinityTerms.length && brandId) {
            similarOr.push({ brand: brandId });
        }
        if (!collectionId && !groupKeys.length && !affinityTerms.length && categoryId) {
            similarOr.push({ category: categoryId });
        }
        if (similarOr.length) {
            similarQuery.$or = similarOr;
        }
        const similarCollectionsPromise = leanPopulate(Product_1.default.find(similarQuery)
            .sort({ ratingAvg: -1, createdAt: -1 })
            .limit(limit));
        const frequentlyBoughtIdsPromise = productId
            ? Cart_1.default.aggregate([
                { $match: { "items.product": productId } },
                { $unwind: "$items" },
                { $match: { "items.product": { $ne: productId } } },
                { $group: { _id: "$items.product", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: limit },
            ])
            : Promise.resolve([]);
        const userId = (_d = req.user) === null || _d === void 0 ? void 0 : _d.id;
        const includePersonalized = Boolean(productId) && userId && mongoose_1.Types.ObjectId.isValid(userId);
        const userObjectId = includePersonalized
            ? new mongoose_1.Types.ObjectId(userId)
            : null;
        const recommendationsData = yield Promise.all([
            newArrivalsPromise,
            trendingProductsPromise,
            similarCollectionsPromise,
            frequentlyBoughtIdsPromise,
            includePersonalized
                ? Promise.all([
                    Wishlist_1.default.findOne({ user: userObjectId }).lean(),
                    Cart_1.default.findOne({ user: userObjectId }).lean(),
                ])
                : Promise.resolve([null, null]),
        ]);
        const [newArrivals, trendingProducts, similarCollections, frequentlyBoughtIds, personalData,] = recommendationsData;
        let userWishlist = null;
        let userCart = null;
        if (Array.isArray(personalData)) {
            [userWishlist, userCart] = personalData;
        }
        const frequentlyBoughtIdsOrdered = frequentlyBoughtIds.map((doc) => doc._id);
        let frequentlyBoughtTogether = frequentlyBoughtIdsOrdered.length
            ? orderByIds(yield leanPopulate(Product_1.default.find(withIdCondition(baseFilter, { $in: frequentlyBoughtIdsOrdered }))), frequentlyBoughtIdsOrdered)
            : [];
        if (!frequentlyBoughtTogether.length) {
            const fallbackFilter = Object.assign({}, baseFilter);
            if (categoryId) {
                fallbackFilter.category = categoryId;
            }
            if (affinityTerms.length) {
                fallbackFilter.$or = [
                    { tag: { $in: affinityTerms } },
                    { "seo.keywords": { $in: affinityTerms } },
                ];
            }
            frequentlyBoughtTogether = yield leanPopulate(Product_1.default.find(fallbackFilter)
                .sort({ salesCount: -1, ratingAvg: -1 })
                .limit(limit));
        }
        const personalizedIds = new Set();
        if (userWishlist === null || userWishlist === void 0 ? void 0 : userWishlist.items) {
            for (const item of userWishlist.items) {
                if (item === null || item === void 0 ? void 0 : item.product) {
                    personalizedIds.add(String(item.product));
                }
            }
        }
        if (userCart === null || userCart === void 0 ? void 0 : userCart.items) {
            for (const item of userCart.items) {
                if (item === null || item === void 0 ? void 0 : item.product) {
                    personalizedIds.add(String(item.product));
                }
            }
        }
        if (productId) {
            personalizedIds.delete(String(productId));
        }
        let recommendedForYou = [];
        if (personalizedIds.size) {
            const ids = Array.from(personalizedIds).map((value) => new mongoose_1.Types.ObjectId(value));
            recommendedForYou = orderByIds(yield leanPopulate(Product_1.default.find(withIdCondition(baseFilter, { $in: ids }))), ids);
        }
        if (recommendedForYou.length < limit) {
            const additionalExclusions = collectObjectIds([
                ...(productId ? [productId] : []),
                ...relatedProducts.map((item) => item === null || item === void 0 ? void 0 : item._id),
            ]);
            recommendedForYou = yield gatherProducts(limit, baseFilter, relatedStrategies, { ratingAvg: -1, salesCount: -1, createdAt: -1 }, recommendedForYou, additionalExclusions);
        }
        res.status(200).json({
            product,
            relatedProducts,
            recommendedForYou,
            frequentlyBoughtTogether,
            featuredProducts,
            newArrivals,
            trendingProducts,
            similarVariants: similarCollections,
            affinityTerms,
        });
    }
    catch (error) {
        console.error("getProductRecommendations error:", error);
        res.status(500).json({ error: "Failed to build product recommendations." });
    }
});
exports.getProductRecommendations = getProductRecommendations;
