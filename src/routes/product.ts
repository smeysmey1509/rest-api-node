import { Router, Request, Response } from "express";
import Product from "../models/Product";
import User from "../models/User";
import { AuthenicationRequest, authenticateToken } from "../middleware/auth";
import { authorizePermission } from "../middleware/authorizePermission";
import { searchProducts } from "../controllers/product/searchProduct.controller";
import { deleteProductById } from "../controllers/product/deleteProductById.controller";
import { createProduct } from "../controllers/product/createProduct.controller";
import { multiDeleteProductController } from "../controllers/product/multiDeleteProduct.controller";
import { editProduct } from "../controllers/product/editProduct.controller";
import { upload } from "../middleware/upload";
import { listProducts } from "../controllers/product/listProducts.controller";
import { getProductRecommendations } from "../controllers/product/recommendations.controller";

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
  upload.array("images"),
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

router.get(
  "/product/:id/recommendations",
  authenticateToken,
  authorizePermission("read"),
  getProductRecommendations
);

export default router;
