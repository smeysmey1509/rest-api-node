import User from "./user.model";

const safeSelect = "name email role status limit createdAt updatedAt";

export const userRepository = {
  findById(id: string) {
    return User.findById(id).select(safeSelect).lean();
  },

  list(filter: Record<string, unknown>, skip: number, limit: number) {
    return User.find(filter)
      .select(safeSelect)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  },

  count(filter: Record<string, unknown>) {
    return User.countDocuments(filter);
  },

  updateProfile(id: string, updates: Record<string, unknown>) {
    return User.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    })
      .select(safeSelect)
      .lean();
  },

  updateStatus(id: string, status: string) {
    return User.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    )
      .select(safeSelect)
      .lean();
  },
};
