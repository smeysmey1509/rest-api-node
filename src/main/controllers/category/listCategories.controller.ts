// src/main/controllers/category/listCategories.controller.ts
import { Response } from "express";
import Category from "../../../models/Category";
import { AuthenicationRequest } from "../../../middleware/auth";

export const listCategories = async (
  req: AuthenicationRequest,
  res: Response
) => {
  try {
    const q = String(req.query.q ?? "").trim();
    const page = Math.max(parseInt(String(req.query.page ?? "1"), 10), 1);
    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit ?? "25"), 10), 1),
      100
    );
    const skip = (page - 1) * limit;

    const sortStr = String(req.query.sort ?? "categoryName:1");
    const sort: Record<string, 1 | -1> = {};
    sortStr.split(",").forEach((pair) => {
      const [field, dir] = pair.split(":");
      if (field) sort[field] = dir === "-1" ? -1 : 1;
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
      Category.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: "products",
            let: { catId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$category", "$$catId"] },
                  isDeleted: { $ne: true },
                },
              },
              {
                $project: {
                  stock: { $ifNull: ["$stock", 0] },
                  price: { $ifNull: ["$priceMin", "$price"] },
                  salesCount: { $ifNull: ["$salesCount", 0] },
                },
              },
              {
                $group: {
                  _id: null,
                  productCount: { $sum: 1 },
                  totalStock: { $sum: "$stock" },
                  avgPrice: { $avg: "$price" },
                  totalSales: { $sum: "$salesCount" },
                },
              },
            ],
            as: "stats",
          },
        },
        {
          $addFields: {
            productCount: { $ifNull: [{ $first: "$stats.productCount" }, 0] },
            totalStock: { $ifNull: [{ $first: "$stats.totalStock" }, 0] },
            avgPrice: { $ifNull: [{ $first: "$stats.avgPrice" }, 0] },
            totalSales: { $ifNull: [{ $first: "$stats.totalSales" }, 0] },
          },
        },
        { $project: { stats: 0 } },
        { $sort: sort },
        { $skip: skip },
        { $limit: limit },
      ]),
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
