import { AppError } from "../../shared/errors/app-error";
import { getPagination, getPaginationMeta } from "../../shared/utils/pagination";
import { userRepository } from "./user.repository";

const profileFields = ["name", "email", "limit"];

const buildUserFilter = (query: Record<string, unknown>) => {
  const filter: Record<string, unknown> = {};
  const q = String(query.q || query.search || "").trim();

  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
    ];
  }

  if (query.role) {
    filter.role = String(query.role).toUpperCase();
  }

  if (query.status) {
    filter.status = String(query.status).toUpperCase();
  }

  return filter;
};

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

  async listUsers(query: Record<string, unknown>) {
    const { page, limit, skip } = getPagination(query, { defaultLimit: 25, maxLimit: 100 });
    const filter = buildUserFilter(query);

    const [users, total] = await Promise.all([
      userRepository.list(filter, skip, limit),
      userRepository.count(filter),
    ]);

    return { users, ...getPaginationMeta(total, page, limit) };
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
