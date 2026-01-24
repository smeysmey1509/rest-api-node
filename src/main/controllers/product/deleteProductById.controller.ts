import { Response } from "express";
import Product from "../../../models/Product";
import { publishProductActivity } from "../../services/activity.service";
import { io } from "../../server";
import { publishNotificationEvent } from "../../services/notification.service";
import { AuthenicationRequest } from "../../../middleware/auth";

export const deleteProductById = async (req: AuthenicationRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ msg: "No valid id provided for deletion." });
      return;
    }

    // Fetch product before deletion
    const product = await Product.findById(id).populate("category", "categoryName description");

    if (!product) {
      res.status(404).json({ msg: "Product not found." });
      return;
    }

    // Prepare snapshot for activity log
    const populatedCategory = product.category as any;
    const productSnapshot = {
      _id: product._id,
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      category: populatedCategory
        ? {
            _id: populatedCategory._id,
            name: populatedCategory.categoryName,
            description: populatedCategory.description,
          }
        : null,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };

    // Delete the product first to avoid notification failures blocking the operation
    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      res.status(404).json({ msg: "Product not found." });
      return;
    }

    // Publish notification for other users without failing the request
    publishNotificationEvent({
      userId: req?.user?.id,
      title: "Delete Product",
      message: `Product ${product.name} has been deleted.`,
      read: false,
    }).catch((err) => {
      console.error("Failed to publish notification event:", err);
    });

    // Log activity via RabbitMQ without failing the request
    publishProductActivity({
      userId: req?.user?.id,
      action: "delete",
      products: [productSnapshot],
    }).catch((err) => {
      console.error("Failed to publish activity log:", err);
    });

    // Emit real-time delete event
    io.emit("product:deleted", product._id);

    res.status(200).json({ msg: "Product deleted successfully.", id: product._id });
    return;
  } catch (err) {
    console.error("❌ Error deleting product:", err);
    res.status(500).json({ error: "Failed to delete product." });
    return;
  }
};
