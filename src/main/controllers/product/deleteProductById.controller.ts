// src/main/controllers/product/deleteProductById.controller.ts
import mongoose, { Types } from "mongoose";
import { Response } from "express";
import Product from "../../../models/Product";
import { publishProductActivity } from "../../services/activity.service";
import { io } from "../../server";
import { publishNotificationEvent } from "../../services/notification.service";
import { AuthenicationRequest } from "../../../middleware/auth";

// If category is populated we only read these fields
type PopulatedCategory = { _id: Types.ObjectId; name: string; description?: string };

// Lean shape that works for BOTH schemas (flat price/stock OR variants)
type ProductLeanBase = {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;

  // classic fields (your current schema)
  price?: number;
  stock?: number;

  // advanced variant fields (optional)
  variants?: Array<{
    price?: { amount?: number };
    inventory?: { onHand?: number; reserved?: number; safetyStock?: number };
    isActive?: boolean;
  }>;

  category?: Types.ObjectId | PopulatedCategory;
};

export const deleteProductById = async (req: AuthenicationRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.isValidObjectId(id)) {
      res.status(400).json({ msg: "Invalid id provided for deletion." });
      return;
    }

    // Fetch only what we need; lean so TS sees a POJO we control.
    const product = await Product.findById(id)
      .select(
        "name description price stock category createdAt updatedAt variants.price variants.inventory variants.isActive"
      )
      .populate("category", "name description")
      .lean<ProductLeanBase>()
      .exec();

    if (!product) {
      res.status(404).json({ msg: "Product not found." });
      return;
    }

    // Normalize category (either ObjectId or populated object)
    const cat =
      product.category && typeof product.category === "object"
        ? (product.category as PopulatedCategory)
        : null;

    // Compute price/stock in a schema-agnostic way
    const computedPrice =
      product.price ??
      product.variants?.find(v => v?.price?.amount != null)?.price?.amount ??
      0;

    const computedStock =
      product.stock ??
      (product.variants || []).reduce((acc, v) => {
        if (!v?.isActive) return acc;
        const onHand = v.inventory?.onHand ?? 0;
        const reserved = v.inventory?.reserved ?? 0;
        const safety = v.inventory?.safetyStock ?? 0;
        const available = Math.max(0, onHand - reserved - safety);
        return acc + available;
      }, 0);

    const productSnapshot = {
      _id: product._id,
      name: product.name,
      description: product.description,
      price: computedPrice,
      stock: computedStock,
      category: cat
        ? { _id: cat._id, name: cat.name, description: cat.description }
        : null,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };

    await publishNotificationEvent({
      userId: req?.user?.id,
      title: "Delete Product",
      message: `Product ${product?.name} has been deleted.`,
      read: false,
    });

    await publishProductActivity({
      user: req.user?.id,
      action: "delete",
      products: [productSnapshot],
    });

    await Product.findByIdAndDelete(id);

    io.emit("product:deleted", String(product._id));

    res.status(200).json({ msg: "Product deleted successfully.", id: product._id });
  } catch (err) {
    console.error("❌ Error deleting product:", err);
    res.status(500).json({ error: "Failed to delete product." });
  }
};
