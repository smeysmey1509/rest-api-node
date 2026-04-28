import { Router } from "express";
import { authenticateToken } from "../../common/middlewares/auth.middleware";
import { asyncHandler } from "../../common/middlewares/async-handler.middleware";
import { requireAdmin } from "../../common/middlewares/role.middleware";
import { validate } from "../../common/middlewares/validate.middleware";
import { categoryController } from "./category.controller";
import { categoryCreateValidation } from "./category.validation";

const router = Router();

router.get("/categories", asyncHandler(categoryController.list));
router.get("/category", asyncHandler(categoryController.listRaw));
router.get("/categories/:id", asyncHandler(categoryController.get));
router.post("/categories", authenticateToken, requireAdmin, validate(categoryCreateValidation), asyncHandler(categoryController.create));
router.post("/category", authenticateToken, requireAdmin, validate(categoryCreateValidation), asyncHandler(categoryController.create));
router.patch("/categories/:id", authenticateToken, requireAdmin, asyncHandler(categoryController.update));
router.put("/category/:id", authenticateToken, requireAdmin, asyncHandler(categoryController.update));
router.delete("/categories/:id", authenticateToken, requireAdmin, asyncHandler(categoryController.remove));
router.delete("/category/:id", authenticateToken, requireAdmin, asyncHandler(categoryController.remove));

export default router;
