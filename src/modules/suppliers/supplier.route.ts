import { Router } from "express";
import { authenticateToken } from "../../shared/middlewares/auth.middleware";
import { asyncHandler } from "../../shared/middlewares/async-handler.middleware";
import { requireAdmin } from "../../shared/middlewares/role.middleware";
import { validate } from "../../shared/middlewares/validate.middleware";
import { supplierController } from "./supplier.controller";
import { supplierValidation } from "./supplier.validation";

const router = Router();

router.get("/suppliers", authenticateToken, asyncHandler(supplierController.list));
router.get("/suppliers/:id", authenticateToken, asyncHandler(supplierController.get));
router.post("/suppliers", authenticateToken, requireAdmin, validate(supplierValidation), asyncHandler(supplierController.create));
router.patch("/suppliers/:id", authenticateToken, requireAdmin, asyncHandler(supplierController.update));
router.delete("/suppliers/:id", authenticateToken, requireAdmin, asyncHandler(supplierController.remove));

export default router;
