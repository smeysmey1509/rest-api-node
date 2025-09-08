import { Request, Response } from "express";
import Category from "../../../models/Category";
import { AuthenicationRequest } from "../../../middleware/auth";

export const getCategoryById = async (req: AuthenicationRequest, res: Response) => {
  try {
    const { id } = req.params;
    const cat = await Category.findById(id).lean();
    if (!cat) {
      res.status(404).json({ error: "Category not found" });
      return;
    }
    res.status(200).json(cat);
  } catch (err) {
    console.error("getCategoryById error:", err);
    res.status(500).json({ error: "Failed to fetch category" });
  }
};
