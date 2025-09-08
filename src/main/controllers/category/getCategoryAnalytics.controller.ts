import { Request, Response } from "express";
import Product from "../../../models/Product";
import { AuthenicationRequest } from "../../../middleware/auth";

export const getCategoryAnalytics = async (
  req: AuthenicationRequest,
  res: Response
) => {
  try {
    const analytics = await Product.aggregate([
      {
        $group: {
          _id: "$category",
          productCount: { $sum: 1 },
          totalStock: { $sum: "$stock" },
          avgPrice: { $avg: "$priceMin" },
          totalSales: { $sum: "$salesCount" },
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $project: {
          _id: 0,
          categoryId: "$category.categoryId",
          categoryName: "$category.categoryName",
          productCount: 1,
          totalStock: 1,
          avgPrice: { $round: ["$avgPrice", 2] },
          totalSales: 1,
        },
      },
      { $sort: { totalSales: -1 } },
    ]);

    res.status(200).json(analytics);
  } catch (err) {
    console.error("Error fetching category analytics:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
};