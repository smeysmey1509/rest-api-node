import { Router } from "express";
import { authenticateToken } from "../../shared/middlewares/auth.middleware";
import { asyncHandler } from "../../shared/middlewares/async-handler.middleware";
import { requireAdmin } from "../../shared/middlewares/role.middleware";
import { validate } from "../../shared/middlewares/validate.middleware";
import { stockLocationController } from "./stock-location.controller";
import { stockLocationValidation } from "./stock-location.validation";

const router = Router();

router.get("/stock-locations", authenticateToken, asyncHandler(stockLocationController.list));
router.get("/stock-locations/:id", authenticateToken, asyncHandler(stockLocationController.get));
router.post("/stock-locations", authenticateToken, requireAdmin, validate(stockLocationValidation), asyncHandler(stockLocationController.create));
router.patch("/stock-locations/:id", authenticateToken, requireAdmin, asyncHandler(stockLocationController.update));
router.delete("/stock-locations/:id", authenticateToken, requireAdmin, asyncHandler(stockLocationController.remove));

export default router;
