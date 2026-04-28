import Product from "./product.model";

export const productRepository = {
  list(filter: Record<string, unknown>, sort: Record<string, 1 | -1>, skip: number, limit: number) {
    return Product.find(filter)
      .populate("brand", "name slug isActive")
      .populate("category", "categoryId categoryName productCount")
      .populate("seller", "name email")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
  },

  count(filter: Record<string, unknown>) {
    return Product.countDocuments(filter);
  },

  findById(id: string) {
    return Product.findById(id).populate("category").populate("brand").populate("seller");
  },

  findBySlug(slug: string) {
    return Product.findOne({ slug }).populate("category").populate("brand").populate("seller");
  },

  create(payload: Record<string, unknown>) {
    return Product.create(payload);
  },

  update(id: string, payload: Record<string, unknown>) {
    return Product.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    }).populate("category").populate("brand").populate("seller");
  },

  softDelete(id: string) {
    return Product.findByIdAndUpdate(
      id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
  },
};
