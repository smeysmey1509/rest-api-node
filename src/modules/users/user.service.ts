import { AppError } from "../../common/utils/appError";
import { userRepository } from "./user.repository";

const profileFields = ["name", "email", "limit"];

export const userService = {
  async getCurrentUser(userId?: string) {
    if (!userId) throw new AppError("Unauthorized", 401);
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError("User not found", 404);
    return user;
  },

  async updateCurrentUser(userId: string | undefined, payload: Record<string, unknown>) {
    if (!userId) throw new AppError("Unauthorized", 401);
    const updates = Object.fromEntries(
      Object.entries(payload).filter(([key]) => profileFields.includes(key))
    );
    const user = await userRepository.updateProfile(userId, updates);
    if (!user) throw new AppError("User not found", 404);
    return user;
  },

  listUsers() {
    return userRepository.list();
  },

  async getUser(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw new AppError("User not found.", 404);
    return user;
  },

  async updateUserStatus(id: string, status: string) {
    const normalized = String(status || "").toUpperCase();
    if (!["ACTIVE", "INACTIVE", "BLOCKED"].includes(normalized)) {
      throw new AppError("Invalid user status", 400);
    }
    const user = await userRepository.updateStatus(id, normalized);
    if (!user) throw new AppError("User not found", 404);
    return user;
  },
};
