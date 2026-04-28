import User from "./user.model";

const safeSelect = "-password";

export const userRepository = {
  findById(id: string) {
    return User.findById(id).select(safeSelect);
  },

  list() {
    return User.find().select(safeSelect).sort({ createdAt: -1 });
  },

  updateProfile(id: string, updates: Record<string, unknown>) {
    return User.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).select(safeSelect);
  },

  updateStatus(id: string, status: string) {
    return User.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).select(safeSelect);
  },
};
