import { Request, Response } from "express";
import Category from "../../../models/Category";
import { AuthenicationRequest } from "../../../middleware/auth";

export const createCategory = async (req: AuthenicationRequest, res: Response) => {
  try {
    const {
      categoryId,
      categoryName,
      description = "",
      productCount = 0,
      totalStock = 0,
      avgPrice = 0,
      totalSales = 0,
    } = req.body || {};

    if (!categoryId || !categoryName) {
      res.status(400).json({ error: "categoryId and categoryName are required" });
      return;
    }

    const doc = await Category.create({
      categoryId: String(categoryId).trim(),
      categoryName: String(categoryName).trim(),
      description: String(description),
      productCount: Number(productCount) || 0,
      totalStock: Number(totalStock) || 0,
      avgPrice: Number(avgPrice) || 0,
      totalSales: Number(totalSales) || 0,
    });

    res.status(201).json({ msg: "Category created.", category: doc });
  } catch (err: any) {
    if (err?.code === 11000) {
      res.status(409).json({ error: "Duplicate key", details: err.keyValue });
      return;
    }
    console.error("createCategory error:", err);
    res.status(500).json({ error: "Failed to create category" });
  }
};
