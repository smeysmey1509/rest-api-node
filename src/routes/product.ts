import { Router, Request, Response } from "express";
import Product, {IProduct} from "../models/Product";
import { authenticateToken } from "../middleware/auth";
import { authorizePermission } from "../middleware/authorizePermission";
import {addToBatch} from "../utils/batchInsertQueue";

const router = Router();

//Get /api/v1/products - Get Product
router.get(
    "/products",
    authenticateToken,
    authorizePermission("read"),
    async (req: Request, res: Response) => {
        try {
            const products = await Product.find().populate("category", "name").populate("seller", 'name email');
            res.status(200).json(products);
        } catch (err) {
            res.status(500).json({ error: "Failed to fetch prodcts" });
        }
    }
);

//Product by ID
router.get(
    "/product/:id",
    authenticateToken,
    authorizePermission("read"),
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            const product = await Product.findById(id);

            if (!product) {
                res.status(404).json({ msg: "Product not found" });
                return;
            }

            res.status(200).json(product);
        } catch (err) {
            console.log(err);
            res.status(500).json({ error: "Failed to fetch product." });
        }
    }
);

//POST /api/v1/products - Create new product
router.post(
    "/products",
    authenticateToken,
    authorizePermission("create"),
    async (req: Request, res: Response) => {
        try {
            const { name, description, price, stock, category, seller } = req.body;

            addToBatch({ name, description, price, stock, category, seller })

            res.status(200).json({ msg: "Product queued for creation." });

        } catch (err: any) {
            console.error("Error adding product:", err.message);
            res.status(400).json({ error: "Server error create product." });
        }
    }
);

//PATCH /api/v1/products/id - Edit Product partial by ID
router.patch(
    "/products/:id",
    authenticateToken,
    authorizePermission("update"),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const { id } = req.params;
            const updates = req.body;

            const updatedProduct = await Product.findByIdAndUpdate(id, updates, {
                new: true,
                runValidators: true,
            });

            if (!updatedProduct) {
                res.status(404).json({ msg: "Product not found." });
                return;
            }

            res.status(200).json(updatedProduct);
        } catch (err) {
            res.status(500).json({ error: "Failed to update product." });
        }
    }
);

//DELETE /api/v1/products/delete/id - Delete Product by ID
router.delete(
    "/product/delete/:id",
    authenticateToken,
    authorizePermission("delete"),
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            const deleteProduct = await Product.findByIdAndDelete(id);

            if (!deleteProduct) {
                res.status(404).json({ msg: "Product not found." });
                return;
            }

            res.status(200).json({ msg: "Product deleted successfully." });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to delete product." });
        }
    }
);

export default router;
