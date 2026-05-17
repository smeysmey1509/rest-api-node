import { Router } from "express";
import { asyncHandler } from "../../shared/middlewares/async-handler.middleware";
import { validate } from "../../shared/middlewares/validate.middleware";
import { authController } from "./auth.controller";
import { loginValidation, registerValidation } from "./auth.validation";

const router = Router();

router.post("/register", validate(registerValidation), asyncHandler(authController.register));
router.post("/login", validate(loginValidation), asyncHandler(authController.login));
router.post("/refresh", asyncHandler(authController.refresh));
router.post("/logout", asyncHandler(authController.logout));

export default router;
