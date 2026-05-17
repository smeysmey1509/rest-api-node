import { Router } from "express";
import { authenticateToken } from "../../shared/middlewares/auth.middleware";
import { asyncHandler } from "../../shared/middlewares/async-handler.middleware";
import { requireAdmin } from "../../shared/middlewares/role.middleware";
import { validate } from "../../shared/middlewares/validate.middleware";
import { brandController } from "./brand.controller";
import { brandCreateValidation } from "./brand.validation";

const router = Router();

router.get("/brands", asyncHandler(brandController.list));
router.post("/brands", authenticateToken, requireAdmin, validate(brandCreateValidation), asyncHandler(brandController.create));
router.patch("/brands/:id", authenticateToken, requireAdmin, asyncHandler(brandController.update));
router.put("/brands/:id", authenticateToken, requireAdmin, asyncHandler(brandController.update));
router.delete("/brands/:id", authenticateToken, requireAdmin, asyncHandler(brandController.remove));

export default router;
