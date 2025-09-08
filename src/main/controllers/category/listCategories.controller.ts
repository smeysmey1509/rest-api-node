import { Request, Response } from "express";
import Category from "../../../models/Category";
import { AuthenicationRequest } from "../../../middleware/auth";

export const listCategories = async (req: AuthenicationRequest, res: Response) => {
  try {
    const q = String(req.query.q ?? "").trim();
    const page = Math.max(parseInt(String(req.query.page || "1"), 10), 1);
    const limit = Math.min(Math.max(parseInt(String(req.query.limit || "25"), 10), 1), 100);
    const skip = (page - 1) * limit;

    // Sorting: ?sort=createdAt:-1 or ?sort=categoryName:1,totalSales:-1
    const sortStr = String(req.query.sort ?? "createdAt:-1");
    const sort: Record<string, 1 | -1> = {};
    sortStr.split(",").forEach(pair => {
      const [field, dir] = pair.split(":");
      if (field) sort[field] = (dir === "-1" ? -1 : 1);
    });

    const filter: any = {};
    if (q) {
      filter.$or = [
        { categoryName: { $regex: q, $options: "i" } },
        { categoryId: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      Category.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Category.countDocuments(filter),
    ]);

    res.status(200).json({
      categories: items,
      total,
      page,
      perPage: limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("listCategories error:", err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
};
