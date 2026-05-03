import Product from "./product.model";

const productListSelect = [
  "name",
  "slug",
  "images",
  "primaryImageIndex",
  "price",
  "priceMin",
  "priceMax",
  "compareAtPrice",
  "currency",
  "stock",
  "status",
  "ratingAvg",
  "ratingCount",
  "salesCount",
  "category",
  "brand",
  "seller",
  "createdAt",
  "updatedAt",
].join(" ");

const productDetailSelect = "-dedupeKey";

type ProductListOptions = {
  populate?: boolean;
};

export const productRepository = {
  list(
    filter: Record<string, unknown>,
    sort: Record<string, 1 | -1>,
    skip: number,
    limit: number,
    options: ProductListOptions = {}
  ) {
    const query = Product.find(filter)
      .select(productListSelect)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    if (options.populate) {
      query
        .populate("brand", "name slug isActive")
        .populate("category", "categoryId categoryName productCount");
    }

    return query.lean({ virtuals: true });
  },

  count(filter: Record<string, unknown>) {
    return Product.countDocuments(filter);
  },

  findById(id: string) {
    return Product.findById(id)
      .select(productDetailSelect)
      .populate("category")
      .populate("brand")
      .populate("seller", "name email role status")
      .lean({ virtuals: true });
  },

  findBySlug(slug: string) {
    return Product.findOne({ slug })
      .select(productDetailSelect)
      .populate("category")
      .populate("brand")
      .populate("seller", "name email role status")
      .lean({ virtuals: true });
  },

  create(payload: Record<string, unknown>) {
    return Product.create(payload);
  },

  update(id: string, payload: Record<string, unknown>) {
    return Product.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    })
      .select(productDetailSelect)
      .populate("category")
      .populate("brand")
      .populate("seller", "name email role status");
  },

  softDelete(id: string) {
    return Product.findByIdAndUpdate(
      id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    ).select("_id isDeleted deletedAt");
  },
};
