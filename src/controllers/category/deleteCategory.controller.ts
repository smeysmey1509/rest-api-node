import { Request, Response } from "express";
import Category from "../../../models/Category";
import { AuthenicationRequest } from "../../../middleware/auth";

export const deleteCategory = async (req: AuthenicationRequest, res: Response) => {
  try {
    const { id } = req.params;

    const deleted = await Category.findByIdAndDelete(id);
    if (!deleted) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    res.status(200).json({ msg: "Category deleted." });
  } catch (err) {
    console.error("deleteCategory error:", err);
    res.status(500).json({ error: "Failed to delete category" });
  }
};
