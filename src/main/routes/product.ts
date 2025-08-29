import { Router, Request, Response } from "express";
import Product from "../../models/Product";
import User from "../../models/User";
import { AuthenicationRequest, authenticateToken } from "../../middleware/auth";
import { authorizePermission } from "../../middleware/authorizePermission";
import { searchProducts } from "../controllers/product/searchProduct.controller";
import { deleteProductById } from "../controllers/product/deleteProductById.controller";
import { createProduct } from "../controllers/product/createProduct.controller";
import { multiDeleteProductController } from "../controllers/product/multiDeleteProduct.controller";
import { editProduct } from "../controllers/product/editProduct.controller";
import { upload } from "../../middleware/upload";

const router = Router();

//Get /api/v1/products - Get All Product
router.get(
  "/product",
  authenticateToken,
  authorizePermission("read"),
  async (_req: Request, res: Response) => {
    try {
      const products = await Product.find({})
        .select(
          "name slug price compareAtPrice currency stock status tag ratingAvg ratingCount salesCount category seller createdAt"
        )
        .populate({ path: "category", select: "name" })
        .populate({ path: "seller", select: "name email" })
        .sort({ createdAt: -1 })
        .lean({ virtuals: true }) // faster for reads; include virtuals if you use mongoose-lean-virtuals
        .exec();

      res.status(200).json(products);
    } catch (err: any) {
      // log real error to server logs for diagnosis
      console.error("GET /api/v1/product error:", err?.message, err?.stack);
      res.status(500).json({ error: "Failed to fetch products." });
    }
  }
);


// GET /api/v1/product?limit=25&page=1
router.get(
  "/products",
  authenticateToken,
  authorizePermission("read"),
  async (req: AuthenicationRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const user = await User.findById(userId);

      const defaultLimit = user?.limit || 25;

      const limit = Math.max(
        parseInt(req.query.limit as string) || defaultLimit,
        1
      );
      const page = Math.max(parseInt(req.query.page as string) || 1, 1);
      const skip = (page - 1) * limit;

      const [products, total] = await Promise.all([
        Product.find()
          .populate("category", "name")
          .populate("seller", "name email")
          .sort({ createdAt: -1 })
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
      console.error("Error fetching paginated products:", err);
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
  "/product",
  upload.array("images"),
  authenticateToken,
  authorizePermission("create"),
  createProduct
);

//PATCH /api/v1/products/id - Edit Product partial by ID
router.patch(
  "/product/:id",
  authenticateToken,
  authorizePermission("update"),
  editProduct
);

// DELETE /api/v1/products/delete/:id - Delete Product by ID
router.delete(
  "/product/delete/:id",
  authenticateToken,
  authorizePermission("delete"),
  deleteProductById
);

//Multi Delete /api/v1/products/delete - Multi Delete Product by ID
router.post(
  "/product/delete",
  authenticateToken,
  authorizePermission("delete"),
  multiDeleteProductController
);

router.get("/products/search", authenticateToken, searchProducts);

export default router;
