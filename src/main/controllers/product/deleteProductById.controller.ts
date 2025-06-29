import { Request, Response } from "express";
import Product from "../../../models/Product";
import { publishProductActivity } from "../../utils/rabbitmq";
import { io } from "../../server";

export const deleteProductById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        if (!id) {
            res.status(400).json({ msg: "Noo valid id provided for deletion." });
            return
        }

        // Fetch product before deletion
        const product = await Product.findById(id).populate("category", "name description");

        if (!product) {
            res.status(404).json({ msg: "Product not found." });
            return
        }

        // Prepare snapshot for activity log
        const productSnapshot = {
            _id: product._id,
            name: product.name,
            description: product.description,
            price: product.price,
            stock: product.stock,
            category: product.category
                ? {
                    _id: (product.category as any)._id,
                    name: (product.category as any).name,
                    description: (product.category as any).description,
                }
                : null,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt
        };

        // Log activity via RabbitMQ
        publishProductActivity({
            user: (req as any).user?.id,
            action: "delete",
            products: [productSnapshot],
        });

        // Delete the product
        await Product.findByIdAndDelete(id);

        // 👇 Emit real-time delete event
        io.emit("product:deleted", product._id);

        res.status(200).json({ msg: "Product deleted successfully.", id: product._id });
        return
    } catch (err) {
        console.error("❌ Error deleting product:", err);
        res.status(500).json({ error: "Failed to delete product." });
        return
    }
};