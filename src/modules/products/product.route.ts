import { Router } from "express";
import { upload } from "../../infrastructure/storage/multer";
import { authenticateToken, optionalAuth } from "../../shared/middlewares/auth.middleware";
import { asyncHandler } from "../../shared/middlewares/async-handler.middleware";
import { requireAdmin } from "../../shared/middlewares/role.middleware";
import { validate } from "../../shared/middlewares/validate.middleware";
import { productController } from "./product.controller";
import { productCreateValidation } from "./product.validation";

const router = Router();

router.get("/products/search", optionalAuth, asyncHandler(productController.search));
router.get("/products/:idOrSlug", optionalAuth, asyncHandler(productController.get));
router.get("/products", optionalAuth, asyncHandler(productController.list));
router.get("/product", optionalAuth, asyncHandler(productController.listRaw));
router.get("/product/:id/recommendations", optionalAuth, asyncHandler(productController.recommendations));
router.get("/product/:id", optionalAuth, asyncHandler(productController.get));

router.post(
  "/product",
  upload.array("images"),
  authenticateToken,
  requireAdmin,
  validate(productCreateValidation),
  asyncHandler(productController.create)
);
router.post(
  "/products",
  upload.array("images"),
  authenticateToken,
  requireAdmin,
  validate(productCreateValidation),
  asyncHandler(productController.create)
);
router.patch("/product/:id", upload.array("images"), authenticateToken, requireAdmin, asyncHandler(productController.update));
router.patch("/products/:id", upload.array("images"), authenticateToken, requireAdmin, asyncHandler(productController.update));
router.delete("/product/delete/:id", authenticateToken, requireAdmin, asyncHandler(productController.remove));
router.delete("/products/:id", authenticateToken, requireAdmin, asyncHandler(productController.remove));
router.post("/product/delete", authenticateToken, requireAdmin, asyncHandler(productController.removeMany));

export default router;
