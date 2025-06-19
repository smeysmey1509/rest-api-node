import { Router, Request, Response } from "express";
import Product  from "../../models/Product";
import User from "../../models/User";
import {AuthenicationRequest, authenticateToken} from "../../middleware/auth";
import { authorizePermission } from "../../middleware/authorizePermission";
import {addToBatch} from "../utils/batchInsertQueue";
import Activity from "../../models/Activity";
import Category, { ICategory } from "../../models/Category";
import {publishProductActivity} from "../utils/rabbitmq";

const router = Router();

//Get /api/v1/products - Get All Product
router.get(
    "/products",
    authenticateToken,
    authorizePermission("read"),
    async (req: Request, res: Response) => {
        try {
            const products = await Product.find().populate("category", "name").populate("seller", 'name email');
            res.status(200).json(products);
        } catch (err) {
            res.status(500).json({ error: "Failed to fetch products." });
        }
    }
);

// GET /api/v1/products?limit=25&page=1
router.get(
    "/product",
    authenticateToken,
    authorizePermission("read"),
    async (req: AuthenicationRequest, res: Response) => {
        try {
            const user = await User.findById(req.user?.id);
            const defaultLimit = user?.limit || 25;

            const limit = parseInt(req.query.limit as string) || defaultLimit;
            const page = parseInt(req.query.page as string) || 1;
            const skip = (page - 1) * limit;

            const [products, total] = await Promise.all([
                Product.find()
                    .populate("category", "name")
                    .populate("seller", "name email")
                    .skip(skip)
                    .limit(limit),
                Product.countDocuments(),
            ]);

            res.status(200).json({
                products,
                total,
                page,
                perPage: limit,
                totalPages: Math.ceil(total / limit),
            });

        } catch (err) {

            console.error("Error fetching products:", err);
            res.status(500).json({ error: "Failed to fetch products." });

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
    async (req: AuthenicationRequest, res: Response) => {
        try {
            const { name, description, price, stock, status,category, seller } = req.body;
            const userInputId = req?.user?.id

            addToBatch({ name, description, price, stock, status, category, seller, userId: userInputId });

            res.status(200).json({ msg: "Product added to batchhh for creation." });

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

// DELETE /api/v1/products/delete/:id - Delete Product by ID
router.delete(
    "/product/delete/:id",
    authenticateToken,
    authorizePermission("delete"),
    async (req: AuthenicationRequest, res: Response) => {
        try {
            const { id } = req.params;

            if (!id) {
                res.status(400).json({ msg: "No valid id provided for deletion." });
                return;
            }

            // Fetch the product with category populated
            const product = await Product.findById(id).populate({
                path: "category",
                select: "name description",
            });

            if (!product) {
                res.status(404).json({ msg: "Product not found." });
                return;
            }

            // Prepare product snapshot for activity
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

            // Create activity log
            await Activity.create({
                user: req.user?.id,
                products: [productSnapshot],
                action: "delete",
            });

            // Delete the product after logging
            await Product.findByIdAndDelete(id);

            res.status(200).json({ msg: "Product deleted successfully." });
        } catch (err) {
            console.error("Error deleting product:", err);
            res.status(500).json({ error: "Failed to delete product." });
        }
    }
);

//Multi Delete /api/v1/products/delete - Multi Delete Product by ID
router.post(
    "/product/delete",
    authenticateToken,
    authorizePermission("delete"),
    async (req: AuthenicationRequest, res: Response) => {
        try {
            const { ids } = req.body;
            const userId = req?.user?.id

            // Multiple delete
            if (Array.isArray(ids) && ids.length > 0) {

                const products = await Product.find({ _id: { $in: ids } });
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

                // Log activity per product
                const activityLog = {
                    user: userId,
                    products: productSnapshots,
                    action: "delete",
                };

                await Activity.create(activityLog);

                const result = await Product.deleteMany({ _id: { $in: ids } });

                if (result.deletedCount === 0){
                    res.status(404).json({ msg: "Product not found no deleted." });
                    return
                }

                res.status(200).json({ msg: `${result.deletedCount} products deleted successfully.` });
                return
            }

            res.status(400).json({ msg: "No valid id(s) provided for deletion." });
            return

        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to delete product(s)." });
            return
        }
    }
);

export default router;
