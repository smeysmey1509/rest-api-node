import User from "../users/user.model";

export const authRepository = {
  findByEmail(email: string) {
    return User.findOne({ email: email.toLowerCase().trim() });
  },

  findByLogin(identifier: string) {
    const value = identifier.trim();
    return User.findOne({
      $or: [{ email: value.toLowerCase() }, { name: value }],
    }).select("+password");
  },

  findById(id: string) {
    return User.findById(id);
  },

  create(payload: { name: string; email: string; password: string; role: string }) {
    return User.create(payload);
  },
};
