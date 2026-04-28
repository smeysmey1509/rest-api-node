import { Router } from "express";
import { authenticateToken } from "../../common/middlewares/auth.middleware";
import { asyncHandler } from "../../common/middlewares/async-handler.middleware";
import { requireAdmin } from "../../common/middlewares/role.middleware";
import { validate } from "../../common/middlewares/validate.middleware";
import { orderController } from "./order.controller";
import { updateOrderStatusValidation } from "./order.validation";

const router = Router();

router.get("/orders", authenticateToken, asyncHandler(orderController.mine));
router.patch("/orders/:id/cancel", authenticateToken, asyncHandler(orderController.cancel));
router.get("/admin/orders", authenticateToken, requireAdmin, asyncHandler(orderController.all));
router.get("/orders/admin", authenticateToken, requireAdmin, asyncHandler(orderController.all));
router.patch(
  "/admin/orders/:id/status",
  authenticateToken,
  requireAdmin,
  validate(updateOrderStatusValidation),
  asyncHandler(orderController.updateStatus)
);
router.patch(
  "/orders/:id/status",
  authenticateToken,
  requireAdmin,
  validate(updateOrderStatusValidation),
  asyncHandler(orderController.updateStatus)
);

export default router;
