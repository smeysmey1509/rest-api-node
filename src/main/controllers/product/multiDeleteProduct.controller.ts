import {AuthenicationRequest} from "../../../middleware/auth";
import { Response } from "express";
import { Types } from "mongoose";
import Product from "../../../models/Product";
import Category, {ICategory} from "../../../models/Category";
import {publishProductActivity} from "../../services/activity.service";
import { io } from "../../server";
import {publishNotificationEvent} from "../../services/notification.service";

// If category is populated we only read these fields
type PopulatedCategory = { _id: Types.ObjectId; name: string; description?: string };

// Lean shape that works for both old and new product schemas
type ProductLeanBase = {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;

  // flat schema fields
  price?: number;
  stock?: number;

  // variant-based schema fields
  variants?: Array<{
    price?: { amount?: number };
    inventory?: {
      onHand?: number;
      reserved?: number;
      safetyStock?: number;
    };
    isActive?: boolean;
  }>;

  // backward compatible category
  category?: Types.ObjectId | PopulatedCategory;
};

export const multiDeleteProductController = async (req: AuthenicationRequest, res: Response) => {
    try {
        const { ids } = req.body;
        const userId = req?.user?.id

        // Multiple delete
        if (Array.isArray(ids) && ids.length > 0) {
            const products = await Product.find({ _id: { $in: ids } })
                .select(
                    "name description price stock category createdAt updatedAt variants.price variants.inventory variants.isActive"
                )
                .populate("category", "name description")
                .lean<ProductLeanBase[]>();

            // Map only the required fields
            const productSnapshots = products.map((product) => {
                const category =
                    product.category && typeof product.category === "object"
                        ? (product.category as PopulatedCategory)
                        : null;

                const price =
                    product.price ??
                    product.variants?.find((v) => v?.price?.amount != null)?.price
                        ?.amount ?? 0;

                const stock =
                    product.stock ??
                    (product.variants || []).reduce((acc, v) => {
                        if (!v?.isActive) return acc;
                        const onHand = v.inventory?.onHand ?? 0;
                        const reserved = v.inventory?.reserved ?? 0;
                        const safety = v.inventory?.safetyStock ?? 0;
                        const available = Math.max(0, onHand - reserved - safety);
                        return acc + available;
                    }, 0);
                return {
                    _id: product._id,
                    name: product.name,
                    description: product.description,
                    price,
                    stock,
                    category: category
                        ? {
                              _id: category._id,
                              name: category.name,
                              description: category.description,
                          }
                        : null,
                    createdAt: product.createdAt,
                    updatedAt: product.updatedAt,
                };
            });

            // 👇 Fire-and-forget: send to RabbitMQ
            publishProductActivity({
                userId: userId,
                action: "delete",
                products: productSnapshots,
            }).catch((err) => {
                console.error("Failed to publish activity log:", err);
            });

            const result = await Product.deleteMany({ _id: { $in: ids } });

            if (result.deletedCount === 0){
                res.status(404).json({ msg: "Product not found no deleted." });
                return
            }

            await publishNotificationEvent({
                user: req?.user?.id,
                title: "Multi Delete Product",
                message: `Product ${products?.map(item => item?.name)} has been deleted.`,
                read: false,
            });

            // ✅ Emit real-time event for each deleted product
            ids.forEach(id => {
                io.emit("product:deleted", id);
            });

            res.status(200).json({ msg: `${result.deletedCount} products deleted successfully.` });
            return
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete product(s)." });
        return
    }
}