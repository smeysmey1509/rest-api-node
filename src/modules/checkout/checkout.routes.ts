import { Router } from "express";
import { authenticateToken } from "../../common/middlewares/auth.middleware";
import { asyncHandler } from "../../common/middlewares/async-handler.middleware";
import { checkoutController } from "./checkout.controller";

const router = Router();

router.post("/checkout", authenticateToken, asyncHandler(checkoutController.checkout));

export default router;
