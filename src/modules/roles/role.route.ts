import { Router } from "express";
import { authenticateToken } from "../../shared/middlewares/auth.middleware";
import { asyncHandler } from "../../shared/middlewares/async-handler.middleware";
import { requireAdmin } from "../../shared/middlewares/role.middleware";
import { roleController } from "./role.controller";

const router = Router();

router.get("/roles", authenticateToken, requireAdmin, asyncHandler(roleController.list));

export default router;
