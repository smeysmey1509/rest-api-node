import { Router } from "express";
import { authenticateToken } from "../../shared/middlewares/auth.middleware";
import { asyncHandler } from "../../shared/middlewares/async-handler.middleware";
import { inventoryMovementController } from "./inventory-movement.controller";

const router = Router();

router.get("/inventory-movements", authenticateToken, asyncHandler(inventoryMovementController.list));
router.get("/inventory-movements/by-unit/:inventoryUnitId", authenticateToken, asyncHandler(inventoryMovementController.byUnit));
router.get("/inventory-movements/by-variant/:variantId", authenticateToken, asyncHandler(inventoryMovementController.byVariant));

export default router;
