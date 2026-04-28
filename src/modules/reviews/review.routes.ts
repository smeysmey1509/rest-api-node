import { Router } from "express";
import { authenticateToken } from "../../common/middlewares/auth.middleware";
import { asyncHandler } from "../../common/middlewares/async-handler.middleware";
import { requireAdmin } from "../../common/middlewares/role.middleware";
import { validate } from "../../common/middlewares/validate.middleware";
import { reviewController } from "./review.controller";
import { reviewCreateValidation } from "./review.validation";

const router = Router();

router.get("/products/:productId/reviews", asyncHandler(reviewController.listApproved));
router.get("/product/:productId/reviews", asyncHandler(reviewController.listApproved));
router.post("/reviews", authenticateToken, validate(reviewCreateValidation), asyncHandler(reviewController.create));
router.patch("/reviews/:id/approve", authenticateToken, requireAdmin, asyncHandler(reviewController.approve));
router.delete("/reviews/:id", authenticateToken, requireAdmin, asyncHandler(reviewController.remove));

export default router;
