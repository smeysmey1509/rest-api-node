import { Response } from "express";
import { AuthenicationRequest } from "../../../middleware/auth";
import Product from "../../../models/Product";
import Category, { ICategory } from "../../../models/Category";
import { publishProductActivity } from "../../services/activity.service";
import { publishNotificationEvent } from "../../services/notification.service";
import { io } from "../../server";

export const multiDeleteProductController = async (req: AuthenicationRequest, res: Response) => {
  try {
    const { ids } = req.body as { ids?: string[] };
    const userId = req?.user?.id;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ msg: "No valid product ids provided for deletion." });
      return;
    }

    const products = await Product.find({ _id: { $in: ids } });

    if (products.length === 0) {
      res.status(404).json({ msg: "Product not found." });
      return;
    }

    const categories: ICategory[] = await Category.find({
      _id: { $in: products.map((p) => p.category) },
    });

    const productSnapshots = products.map((product) => {
      const category = categories.find((c) => (c as any)._id.equals(product.category));
      return {
        _id: product._id,
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
        category: category
          ? {
              _id: category._id,
              name: category.categoryName,
              description: category.description,
            }
          : null,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      };
    });

    const deleteResult = await Product.deleteMany({ _id: { $in: ids } });

    if (deleteResult.deletedCount === 0) {
      res.status(404).json({ msg: "Product not found." });
      return;
    }

    const deletedIds = products.map((product) => String(product._id));
    const deletedNames = products.map((product) => product.name).join(", ");

    publishProductActivity({
      userId,
      action: "delete",
      products: productSnapshots,
    }).catch((err) => {
      console.error("Failed to publish activity log:", err);
    });

    publishNotificationEvent({
      userId,
      title: "Multi Delete Product",
      message: `Products deleted: ${deletedNames}`,
      read: false,
    }).catch((err) => {
      console.error("Failed to publish notification event:", err);
    });

    deletedIds.forEach((deletedId) => {
      io.emit("product:deleted", deletedId);
    });

    res.status(200).json({
      msg: `${deleteResult.deletedCount} products deleted successfully.`,
      ids: deletedIds,
    });
    return;
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete product(s)." });
    return;
  }
};
