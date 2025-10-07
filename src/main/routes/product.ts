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
import { listProducts } from "../controllers/product/listProducts.controller";

const router = Router();

//Get /api/v1/products - Get All Product
router.get(
  "/product",
  authenticateToken,
  authorizePermission("read"),
  async (req: Request, res: Response) => {
    try {
      const products = await Product.find()
        .populate("brand", "name slug isActive")
        .populate("category", "categoryId categoryName productCount")
        .populate("seller", "name email")
        .sort({ createdAt: -1 });
      res.status(200).json(products);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch products." });
    }
  }
);

//Filter Product
router.get(
  "/products",
  authenticateToken,
  authorizePermission("read"),
  listProducts
);

// GET /api/v1/product?limit=25&page=1
router.get(
  "/products",
  authenticateToken,
  authorizePermission("read"),
  async (req: AuthenicationRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const user = await User.findById(userId).lean();

      // 🧩 Parse pagination safely
      const defaultLimit = user?.limit || 25;
      const limitParam = Number(req.query.limit);
      const pageParam = Number(req.query.page);

      const limit =
        !isNaN(limitParam) && limitParam > 0 ? limitParam : defaultLimit;
      const page = !isNaN(pageParam) && pageParam > 0 ? pageParam : 1;
      const skip = (page - 1) * limit;

      // 🧩 Query products
      const [products, total] = await Promise.all([
        Product.find({ isDeleted: { $ne: true } })
          .populate("category")
          .populate("seller")
          .populate("brand")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Product.countDocuments({ isDeleted: { $ne: true } }),
      ]);

      const totalPages = Math.ceil(total / limit);

      // 🧩 Pagination metadata
      res.status(200).json({
        pagination: {
          total,
          page,
          perPage: limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        products,
      });
    } catch (err) {
      console.error("❌ Error fetching paginated products:", err);
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

      const product = await Product.findById(id)
        .populate("category")
        .populate("brand")
        .populate("seller")
        .lean();

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
