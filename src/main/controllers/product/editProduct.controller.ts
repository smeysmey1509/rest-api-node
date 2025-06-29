import {AuthenicationRequest} from "../../../middleware/auth";
import {Response} from "express";
import Product from "../../../models/Product";
import {publishProductActivity} from "../../utils/rabbitmq";
import {io} from "../../server";


export const editProduct = async (req: AuthenicationRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const userId = req.user?.id

        // Quickly update and return the updated fields only (no revalidation or populate)
        const result = await Product.findByIdAndUpdate(id, updates, {
            new: true,
        })
            .populate("category", "name description")  // ✅ Include fields you want
            .populate("seller", "name email");

        if (!result) {
            res.status(404).json({ msg: "Product not found" });
            return
        }

        // Fire-and-forget activity logging via RabbitMQ
        publishProductActivity({
            user: userId,
            action: "update",
            products: [
                {
                    _id: id,
                    ...updates
                }
            ]
        }).catch(err => console.error("🐇 Failed to log update activity:", err));

        io.emit("product:edit", result);

        res.status(200).json({
            msg: "Product updated successfully.",
            product: result,
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to update product." });
    }
}