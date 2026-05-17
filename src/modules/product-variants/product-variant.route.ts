import { Router } from "express";
import { authenticateToken, optionalAuth } from "../../shared/middlewares/auth.middleware";
import { asyncHandler } from "../../shared/middlewares/async-handler.middleware";
import { requireAdmin } from "../../shared/middlewares/role.middleware";
import { validate } from "../../shared/middlewares/validate.middleware";
import { productVariantController } from "./product-variant.controller";
import { productVariantCreateValidation } from "./product-variant.validation";

const router = Router();

router.get("/products/:productId/variants", optionalAuth, asyncHandler(productVariantController.listByProduct));
router.post(
  "/products/:productId/variants",
  authenticateToken,
  requireAdmin,
  validate(productVariantCreateValidation),
  asyncHandler(productVariantController.create)
);
router.patch("/product-variants/:variantId", authenticateToken, requireAdmin, asyncHandler(productVariantController.update));
router.delete("/product-variants/:variantId", authenticateToken, requireAdmin, asyncHandler(productVariantController.remove));

export default router;
