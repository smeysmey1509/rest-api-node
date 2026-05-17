import { Router } from "express";
import { authenticateToken } from "../../shared/middlewares/auth.middleware";
import { asyncHandler } from "../../shared/middlewares/async-handler.middleware";
import { requireAdmin } from "../../shared/middlewares/role.middleware";
import { paymentController } from "./payment.controller";

const router = Router();

router.get("/payments/:id", authenticateToken, asyncHandler(paymentController.get));
router.post("/payments/:id/verify", authenticateToken, asyncHandler(paymentController.verify));
router.post("/payments/:id/confirm-manual", authenticateToken, requireAdmin, asyncHandler(paymentController.confirmManual));

export default router;
