"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../shared/middlewares/auth.middleware");
const async_handler_middleware_1 = require("../../shared/middlewares/async-handler.middleware");
const checkout_controller_1 = require("./checkout.controller");
const router = (0, express_1.Router)();
router.post("/checkout", auth_middleware_1.authenticateToken, (0, async_handler_middleware_1.asyncHandler)(checkout_controller_1.checkoutController.checkout));
exports.default = router;
