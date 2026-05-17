import { AppError } from "../../shared/errors/app-error";
import { generateSlug } from "../../shared/utils/generateSlug";
import { brandRepository } from "./brand.repository";

const parseSort = (input?: string): Record<string, 1 | -1> => {
  const sort: Record<string, 1 | -1> = {};
  (input || "name:1").split(",").forEach((pair) => {
    const [field, dir] = pair.split(":");
    if (field) sort[field] = dir === "-1" ? -1 : 1;
  });
  return sort;
};

export const brandService = {
  async list(query: Record<string, unknown>) {
    const q = String(query.q ?? "").trim();
    const page = Math.max(parseInt(String(query.page ?? "1"), 10), 1);
    const limit = Math.min(Math.max(parseInt(String(query.limit ?? "25"), 10), 1), 100);
    const skip = (page - 1) * limit;
    const sort = parseSort(String(query.sort ?? "name:1"));

    const filter: any = {};
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { slug: { $regex: q, $options: "i" } },
      ];
    }
    if (typeof query.isActive !== "undefined") {
      const value = String(query.isActive);
      filter.isActive = value === "1" || value.toLowerCase() === "true";
    }

    const [brands, total] = await Promise.all([
      brandRepository.list(filter, sort, skip, limit),
      brandRepository.count(filter),
    ]);

    return { brands, total, page, perPage: limit, totalPages: Math.ceil(total / limit) };
  },

  async create(payload: Record<string, unknown>) {
    const name = String(payload.name || "").trim();
    if (!name) throw new AppError("name is required", 400);
    const slug = String(payload.slug || generateSlug(name)).trim();
    if (!slug) throw new AppError("slug could not be derived from name", 400);

    try {
      return await brandRepository.create({
        name,
        slug: generateSlug(slug),
        isActive: typeof payload.isActive === "boolean" ? payload.isActive : true,
      });
    } catch (err: any) {
      if (err?.code === 11000) throw new AppError("Brand already exists.", 409);
      throw err;
    }
  },

  async update(id: string, payload: Record<string, unknown>) {
    const updates: Record<string, unknown> = {};
    if (payload.name !== undefined) updates.name = String(payload.name).trim();
    if (payload.slug !== undefined) updates.slug = generateSlug(String(payload.slug));
    if (payload.isActive !== undefined) updates.isActive = Boolean(payload.isActive);
    const brand = await brandRepository.update(id, updates);
    if (!brand) throw new AppError("Brand not found", 404);
    return brand;
  },

  async remove(id: string) {
    const brand = await brandRepository.delete(id);
    if (!brand) throw new AppError("Brand not found", 404);
    return { msg: "Brand deleted successfully." };
  },
};
