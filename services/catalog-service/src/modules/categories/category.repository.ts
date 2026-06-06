import Category from "./category.model";

export const categoryRepository = {
  list(filter: Record<string, unknown>, sort: Record<string, 1 | -1>, skip: number, limit: number) {
    return Category.find(filter).sort(sort).skip(skip).limit(limit).lean();
  },

  count(filter: Record<string, unknown>) {
    return Category.countDocuments(filter);
  },

  findById(id: string) {
    return Category.findById(id);
  },

  create(payload: Record<string, unknown>) {
    return Category.create(payload);
  },

  update(id: string, payload: Record<string, unknown>) {
    return Category.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });
  },

  delete(id: string) {
    return Category.findByIdAndDelete(id);
  },
};
