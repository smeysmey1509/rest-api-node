import {AuthenicationRequest} from "../../../middleware/auth";
import {Response} from "express";
import Product from "../../../models/Product";
import Category, {ICategory} from "../../../models/Category";
import {publishProductActivity} from "../../services/activity.service";
import { io } from "../../server";
import {publishNotificationEvent} from "../../services/notification.service";

export const multiDeleteProductController = async (req: AuthenicationRequest, res: Response) => {
    try {
        const { ids } = req.body;
        const userId = req?.user?.id

        // Multiple delete
        if (Array.isArray(ids) && ids.length > 0) {           const products = await Product.find({ _id: { $in: ids } });
            const categories: ICategory[] = await Category.find({
                _id: { $in: products.map((p) => p.category) },
            });

            // Map only the required fields
            const productSnapshots = products.map(product => {
                const category = categories.find(
                    (c) => (c as any)._id.equals(product.category)
                );
                return {
                    _id: product._id,
                    name: product.name,
                    description: product.description,
                    price: product.price,
                    stock: product.stock,
                    category: category ? {
                        _id: category._id,
                        name: category.name,
                        description: category.description,
                    } : null,
                    createdAt: product.createdAt,
                    updatedAt: product.updatedAt
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