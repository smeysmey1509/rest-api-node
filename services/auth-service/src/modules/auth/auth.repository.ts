import User from "@services/user-service/src/modules/users/user.model";

const publicAuthSelect = "name email role status limit createdAt updatedAt";

export const authRepository = {
  findByEmail(email: string) {
    return User.findOne({ email: email.toLowerCase().trim() })
      .select("_id")
      .lean();
  },

  findByLogin(identifier: string) {
    const value = identifier.trim();
    return User.findOne({
      $or: [{ email: value.toLowerCase() }, { name: value }],
    }).select(`+password ${publicAuthSelect}`);
  },

  findActiveById(id: string) {
    return User.findOne({ _id: id, status: "ACTIVE" })
      .select(publicAuthSelect)
      .lean();
  },

  create(payload: { name: string; email: string; password: string; role: string }) {
    return User.create(payload);
  },
};
