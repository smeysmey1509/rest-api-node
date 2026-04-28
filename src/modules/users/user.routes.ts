import { Router } from "express";
import { authenticateToken } from "../../common/middlewares/auth.middleware";
import { asyncHandler } from "../../common/middlewares/async-handler.middleware";
import { requireAdmin } from "../../common/middlewares/role.middleware";
import { validate } from "../../common/middlewares/validate.middleware";
import { userController } from "./user.controller";
import { updateStatusValidation } from "./user.validation";

const router = Router();

router.get("/me", authenticateToken, asyncHandler(userController.getProfile));
router.patch("/me", authenticateToken, asyncHandler(userController.updateProfile));
router.get("/profile", authenticateToken, asyncHandler(userController.legacyProfile));
router.patch("/profile", authenticateToken, asyncHandler(userController.updateProfile));

router.get("/users", authenticateToken, requireAdmin, asyncHandler(userController.listUsers));
router.get("/users/:id", authenticateToken, requireAdmin, asyncHandler(userController.getUser));
router.patch(
  "/users/:id/status",
  authenticateToken,
  requireAdmin,
  validate(updateStatusValidation),
  asyncHandler(userController.updateUserStatus)
);

export default router;
