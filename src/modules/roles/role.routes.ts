import { Router } from "express";
import { authenticateToken } from "../../common/middlewares/auth.middleware";
import { asyncHandler } from "../../common/middlewares/async-handler.middleware";
import { requireAdmin } from "../../common/middlewares/role.middleware";
import { roleController } from "./role.controller";

const router = Router();

router.get("/roles", authenticateToken, requireAdmin, asyncHandler(roleController.list));

export default router;
