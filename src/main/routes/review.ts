import { Router, Request, Response } from "express";
import { AuthenicationRequest, authenticateToken } from "../../middleware/auth";
import { authorizePermission } from "../../middleware/authorizePermission";
import { createReview } from "../controllers/review/createReview.controller.ts";

const router = Router();

// POST /api/reviews
router.post("/reviews", authenticateToken, authorizePermission("create"), createReview);

export default router;