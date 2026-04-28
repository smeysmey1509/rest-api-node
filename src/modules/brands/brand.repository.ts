import Brand from "./brand.model";

export const brandRepository = {
  list(filter: Record<string, unknown>, sort: Record<string, 1 | -1>, skip: number, limit: number) {
    return Brand.find(filter).sort(sort).skip(skip).limit(limit).lean();
  },

  count(filter: Record<string, unknown>) {
    return Brand.countDocuments(filter);
  },

  findById(id: string) {
    return Brand.findById(id);
  },

  create(payload: Record<string, unknown>) {
    return Brand.create(payload);
  },

  update(id: string, payload: Record<string, unknown>) {
    return Brand.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });
  },

  delete(id: string) {
    return Brand.findByIdAndDelete(id);
  },
};
