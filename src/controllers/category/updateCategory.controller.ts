import { Request, Response } from "express";
import Category from "../../../models/Category";
import { AuthenicationRequest } from "../../../middleware/auth";

export const updateCategory = async (req: AuthenicationRequest, res: Response) => {
  try {
    const { id } = req.params;

    const updatable = [
      "categoryId",
      "categoryName",
      "description",
      "productCount",
      "totalStock",
      "avgPrice",
      "totalSales",
    ] as const;

    const updates: any = {};
    for (const key of updatable) {
      if (key in req.body) updates[key] = req.body[key];
    }

    if (typeof updates.categoryId === "string") updates.categoryId = updates.categoryId.trim();
    if (typeof updates.categoryName === "string") updates.categoryName = updates.categoryName.trim();
    if (typeof updates.description === "string") updates.description = updates.description.trim();

    ["productCount", "totalStock", "avgPrice", "totalSales"].forEach((k) => {
      if (k in updates) updates[k] = Number(updates[k]) || 0;
    });

    const doc = await Category.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    res.status(200).json({ msg: "Category updated.", category: doc });
  } catch (err: any) {
    if (err?.code === 11000) {
      res.status(409).json({ error: "Duplicate key", details: err.keyValue });
      return;
    }
    console.error("updateCategory error:", err);
    res.status(500).json({ error: "Failed to update category" });
  }
};
