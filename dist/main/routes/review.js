"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const authorizePermission_1 = require("../../middleware/authorizePermission");
const createReview_controller_ts_1 = require("../controllers/review/createReview.controller.ts");
const router = (0, express_1.Router)();
// POST /api/reviews
router.post("/reviews", auth_1.authenticateToken, (0, authorizePermission_1.authorizePermission)("create"), createReview_controller_ts_1.createReview);
exports.default = router;
