import { Router } from "express";
import { authenticateToken } from "../../common/middlewares/auth.middleware";
import { asyncHandler } from "../../common/middlewares/async-handler.middleware";
import { requireAdmin } from "../../common/middlewares/role.middleware";
import { paymentController } from "./payment.controller";

const router = Router();

router.post("/payments/webhook/payway", asyncHandler(paymentController.webhookPayway));
router.get("/payments/:id", authenticateToken, asyncHandler(paymentController.get));
router.post("/payments/:id/verify", authenticateToken, asyncHandler(paymentController.verify));
router.post("/payments/:id/confirm-manual", authenticateToken, requireAdmin, asyncHandler(paymentController.confirmManual));

export default router;
