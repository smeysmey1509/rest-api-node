import { Response } from "express";
import { Types } from "mongoose";
import Product from "../../models/Product";
import Wishlist from "../../models/Wishlist";
import Cart from "../../models/Cart";
import { AuthenicationRequest } from "../../../middleware/auth";

const DEFAULT_LIMIT = 8;

const BASE_PRODUCT_FILTER = {
  isDeleted: { $ne: true },
  status: { $ne: "Unpublished" },
} as const;

type WishlistLean = { items?: { product?: Types.ObjectId }[] } | null;
type CartLean = { items?: { product?: Types.ObjectId }[] } | null;

const leanPopulate = (query: any): Promise<any> =>
  query
    .select("-dedupeKey")
    .populate("category")
    .populate("brand")
    .populate("seller")
    .lean({ virtuals: true })
    .exec();

const toObjectId = (value: unknown): Types.ObjectId | null => {
  if (!value) return null;
  if (value instanceof Types.ObjectId) return value;
  if (typeof value === "string" && Types.ObjectId.isValid(value)) {
    return new Types.ObjectId(value);
  }
  if (typeof value === "object" && "_id" in (value as Record<string, unknown>)) {
    return toObjectId((value as Record<string, unknown>)._id);
  }
  return null;
};

const orderByIds = <T extends { _id: Types.ObjectId | string }>(
  docs: T[],
  ids: Types.ObjectId[]
): T[] => {
  if (!ids.length) return docs;
  const map = new Map<string, T>();
  for (const doc of docs) {
    map.set(String(doc._id), doc);
  }
  return ids
    .map((id) => map.get(String(id)))
    .filter((doc): doc is T => Boolean(doc));
};

const normalizeLimit = (limit?: string | number) => {
  const numeric = Number(limit);
  if (Number.isFinite(numeric) && numeric > 0 && numeric <= 50) {
    return Math.floor(numeric);
  }
  return DEFAULT_LIMIT;
};

const toStringArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === "string" ? item.trim() : String(item ?? "").trim()
      )
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

const uniqueStrings = (values: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    if (!raw) continue;
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(value);
    }
  }
  return result;
};

const toOptionalString = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  return null;
};

const toOptionalStringArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : null))
      .filter((item): item is string => Boolean(item && item.length));
  }
  return [];
};

const buildAffinityClauses = (
  terms: string[]
): Record<string, unknown>[] => {
  if (!terms.length) return [];
  return [
    { tag: { $in: terms } },
    { "seo.keywords": { $in: terms } },
  ];
};

const collectObjectIds = (values: unknown[]): Types.ObjectId[] =>
  values
    .map((value) => toObjectId(value))
    .filter((value): value is Types.ObjectId => Boolean(value));

const gatherProducts = async (
  limit: number,
  baseFilter: Record<string, unknown>,
  strategies: (Record<string, unknown> | null | undefined)[],
  sort: Record<string, 1 | -1>,
  seed: any[] = [],
  extraExclusions: Types.ObjectId[] = []
): Promise<any[]> => {
  if (limit <= 0) return [];

  const results: any[] = [...seed];
  const seenIds = new Set<string>(seed.map((item) => String(item?._id)));
  const excludeIds: Types.ObjectId[] = [
    ...extraExclusions,
    ...collectObjectIds(seed.map((item) => item?._id)),
  ];

  for (const strategy of strategies) {
    if (!strategy || results.length >= limit) {
      if (results.length >= limit) break;
      continue;
    }

    const remaining = limit - results.length;
    if (remaining <= 0) break;

    let filter: Record<string, unknown> = {
      ...baseFilter,
      ...strategy,
    };

    if (excludeIds.length) {
      filter = withIdCondition(filter, { $nin: excludeIds });
    }

    const docs = await leanPopulate(
      Product.find(filter)
        .sort(sort)
        .limit(remaining)
    );

    for (const doc of docs) {
      const id = String(doc?._id);
      if (!id || seenIds.has(id)) continue;

      seenIds.add(id);
      results.push(doc);

      const objectId = toObjectId(doc?._id);
      if (objectId) {
        excludeIds.push(objectId);
      }

      if (results.length >= limit) {
        break;
      }
    }
  }

  return results.slice(0, limit);
};

const getCollectionContext = (product: any) => {
  if (!product) {
    return { collectionId: null as Types.ObjectId | null, groupKeys: [] as string[] };
  }

  const rawGroupCandidates: string[] = [
    toOptionalString(product.groupId),
    toOptionalString(product.productGroupId),
    toOptionalString(product.variantGroupId),
    toOptionalString(product.collectionHandle),
    ...toOptionalStringArray(product.groupIds),
    ...toOptionalStringArray(product.collectionHandles),
  ].filter((value): value is string => Boolean(value));

  return {
    collectionId: toObjectId(product.productCollectionId),
    groupKeys: uniqueStrings(rawGroupCandidates),
  };
};

const withIdCondition = (
  filter: Record<string, unknown>,
  condition: Record<string, unknown>
) => {
  const current =
    filter._id && typeof filter._id === "object" && !Array.isArray(filter._id)
      ? (filter._id as Record<string, unknown>)
      : {};

  return {
    ...filter,
    _id: { ...current, ...condition },
  };
};

export const getProductRecommendations = async (
  req: AuthenicationRequest,
  res: Response
): Promise<void> => {
  try {
    const limit = normalizeLimit(req.query.limit as string | undefined);
    const paramId = req.params?.id as string | undefined;
    const queryId = req.query.productId as string | undefined;
    const rawId = paramId ?? queryId ?? null;

    let productId: Types.ObjectId | null = null;
    if (rawId && Types.ObjectId.isValid(rawId)) {
      productId = new Types.ObjectId(rawId);
    }

    const requestedTags = toStringArray(req.query.tags);
    const requestedKeywords = toStringArray(req.query.keywords);

    const product = productId
      ? await leanPopulate(
        Product.findOne({ _id: productId, ...BASE_PRODUCT_FILTER })
      )
      : null;

    if (productId && !product) {
      res.status(404).json({ error: "Product not found." });
      return;
    }

    const categoryId = product ? toObjectId((product as any).category) : null;
    const brandId = product ? toObjectId((product as any).brand) : null;
    const productTags = product && Array.isArray((product as any).tag)
      ? (product as any).tag.filter((value: unknown): value is string =>
        typeof value === "string" && value.length > 0
      )
      : [];
    const productKeywords = product && Array.isArray((product as any)?.seo?.keywords)
      ? (product as any).seo.keywords.filter(
        (value: unknown): value is string =>
          typeof value === "string" && value.length > 0
      )
      : [];
    const { collectionId, groupKeys } = getCollectionContext(product);

    const affinityTerms = uniqueStrings([
      ...productTags,
      ...productKeywords,
      ...requestedTags,
      ...requestedKeywords,
    ]);

    const affinityClauses = buildAffinityClauses(affinityTerms);

    const baseFilter: Record<string, unknown> = {
      ...BASE_PRODUCT_FILTER,
    };
    if (productId) {
      baseFilter._id = { $ne: productId };
    }

    const relatedStrategies: (Record<string, unknown> | null)[] = [
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

    const featuredStrategies: (Record<string, unknown> | null)[] = [
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

    const relatedProducts = await gatherProducts(
      limit,
      baseFilter,
      relatedStrategies,
      { salesCount: -1, ratingAvg: -1, createdAt: -1 }
    );

    const featuredProducts = await gatherProducts(
      limit,
      baseFilter,
      featuredStrategies,
      { createdAt: -1 }
    );

    const newArrivalsPromise = leanPopulate(
      Product.find(baseFilter)
        .sort({ createdAt: -1 })
        .limit(limit)
    );

    const trendingFilter: Record<string, unknown> = {
      ...baseFilter,
      $or: [{ isTrending: true }, { salesCount: { $gt: 0 } }],
    };
    const trendingProductsPromise = leanPopulate(
      Product.find(trendingFilter)
        .sort({ isTrending: -1, salesCount: -1, updatedAt: -1 })
        .limit(limit)
    );

    const similarQuery: Record<string, unknown> = { ...baseFilter };
    const similarOr: Record<string, unknown>[] = [];

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

    const similarCollectionsPromise = leanPopulate(
      Product.find(similarQuery)
        .sort({ ratingAvg: -1, createdAt: -1 })
        .limit(limit)
    );

    const frequentlyBoughtIdsPromise: Promise<
      { _id: Types.ObjectId; count: number }[]
    > = productId
        ? Cart.aggregate<{
          _id: Types.ObjectId;
          count: number;
        }>([
          { $match: { "items.product": productId } },
          { $unwind: "$items" },
          { $match: { "items.product": { $ne: productId } } },
          { $group: { _id: "$items.product", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: limit },
        ])
        : Promise.resolve<{ _id: Types.ObjectId; count: number }[]>([]);

    const userId = req.user?.id;
    const includePersonalized =
      Boolean(productId) && userId && Types.ObjectId.isValid(userId);
    const userObjectId = includePersonalized
      ? new Types.ObjectId(userId as string)
      : null;

    const recommendationsData = await Promise.all([
      newArrivalsPromise,
      trendingProductsPromise,
      similarCollectionsPromise,
      frequentlyBoughtIdsPromise,
      includePersonalized
        ? Promise.all([
          Wishlist.findOne({ user: userObjectId }).lean(),
          Cart.findOne({ user: userObjectId }).lean(),
        ])
        : Promise.resolve<[null, null]>([null, null]),
    ]);

    const [
      newArrivals,
      trendingProducts,
      similarCollections,
      frequentlyBoughtIds,
      personalData,
    ] = recommendationsData;

    let userWishlist: WishlistLean = null;
    let userCart: CartLean = null;

    if (Array.isArray(personalData)) {
      [userWishlist, userCart] = personalData;
    }

    const frequentlyBoughtIdsOrdered = frequentlyBoughtIds.map((doc) => doc._id);
    let frequentlyBoughtTogether = frequentlyBoughtIdsOrdered.length
      ? orderByIds(
        await leanPopulate(
          Product.find(
            withIdCondition(baseFilter, { $in: frequentlyBoughtIdsOrdered })
          )
        ),
        frequentlyBoughtIdsOrdered
      )
      : [];

    if (!frequentlyBoughtTogether.length) {
      const fallbackFilter: Record<string, unknown> = { ...baseFilter };
      if (categoryId) {
        fallbackFilter.category = categoryId;
      }
      if (affinityTerms.length) {
        fallbackFilter.$or = [
          { tag: { $in: affinityTerms } },
          { "seo.keywords": { $in: affinityTerms } },
        ];
      }

      frequentlyBoughtTogether = await leanPopulate(
        Product.find(fallbackFilter)
          .sort({ salesCount: -1, ratingAvg: -1 })
          .limit(limit)
      );
    }

    const personalizedIds = new Set<string>();
    if (userWishlist?.items) {
      for (const item of userWishlist.items) {
        if (item?.product) {
          personalizedIds.add(String(item.product));
        }
      }
    }
    if (userCart?.items) {
      for (const item of userCart.items) {
        if (item?.product) {
          personalizedIds.add(String(item.product));
        }
      }
    }

    if (productId) {
      personalizedIds.delete(String(productId));
    }

    let recommendedForYou: any[] = [];
    if (personalizedIds.size) {
      const ids = Array.from(personalizedIds).map(
        (value) => new Types.ObjectId(value)
      );
      recommendedForYou = orderByIds(
        await leanPopulate(
          Product.find(withIdCondition(baseFilter, { $in: ids }))
        ),
        ids
      );
    }

    if (recommendedForYou.length < limit) {
      const additionalExclusions = collectObjectIds([
        ...(productId ? [productId] : []),
        ...relatedProducts.map((item) => item?._id),
      ]);

      recommendedForYou = await gatherProducts(
        limit,
        baseFilter,
        relatedStrategies,
        { ratingAvg: -1, salesCount: -1, createdAt: -1 },
        recommendedForYou,
        additionalExclusions
      );
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
  } catch (error) {
    console.error("getProductRecommendations error:", error);
    res.status(500).json({ error: "Failed to build product recommendations." });
  }
};