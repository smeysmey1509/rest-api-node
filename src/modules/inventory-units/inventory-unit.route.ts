import { Router } from "express";
import { authenticateToken } from "../../shared/middlewares/auth.middleware";
import { asyncHandler } from "../../shared/middlewares/async-handler.middleware";
import { requireAdmin } from "../../shared/middlewares/role.middleware";
import { validate } from "../../shared/middlewares/validate.middleware";
import { inventoryUnitController } from "./inventory-unit.controller";
import {
  reserveInventoryValidation,
  returnInventoryValidation,
  sellInventoryValidation,
  stockInValidation,
} from "./inventory-unit.validation";

const router = Router();

router.get("/inventory-units/search", authenticateToken, asyncHandler(inventoryUnitController.search));
router.get("/inventory-units", authenticateToken, asyncHandler(inventoryUnitController.list));
router.get("/inventory-units/:id", authenticateToken, asyncHandler(inventoryUnitController.get));
router.post(
  "/inventory-units/stock-in",
  authenticateToken,
  requireAdmin,
  validate(stockInValidation),
  asyncHandler(inventoryUnitController.stockIn)
);
router.post(
  "/inventory-units/reserve",
  authenticateToken,
  validate(reserveInventoryValidation),
  asyncHandler(inventoryUnitController.reserve)
);
router.post("/inventory-units/release", authenticateToken, asyncHandler(inventoryUnitController.release));
router.post(
  "/inventory-units/sell",
  authenticateToken,
  validate(sellInventoryValidation),
  asyncHandler(inventoryUnitController.sell)
);
router.post(
  "/inventory-units/return",
  authenticateToken,
  validate(returnInventoryValidation),
  asyncHandler(inventoryUnitController.returnUnit)
);

export default router;
