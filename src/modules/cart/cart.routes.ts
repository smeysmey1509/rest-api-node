import { Router } from "express";
import multer from "multer";
import { authenticateToken } from "../../common/middlewares/auth.middleware";
import { asyncHandler } from "../../common/middlewares/async-handler.middleware";
import { validate } from "../../common/middlewares/validate.middleware";
import { cartController } from "./cart.controller";
import { addCartValidation } from "./cart.validation";

const router = Router();
const upload = multer();

router.get("/cart", authenticateToken, asyncHandler(cartController.get));
router.post("/cart/add", authenticateToken, validate(addCartValidation), asyncHandler(cartController.add));
router.post("/cart/remove", authenticateToken, upload.none(), asyncHandler(cartController.remove));
router.delete("/cart/:productId", authenticateToken, asyncHandler(cartController.remove));
router.put("/cart/update/:productId", authenticateToken, asyncHandler(cartController.updateQuantity));
router.patch("/cart/:productId", authenticateToken, asyncHandler(cartController.updateQuantity));
router.post("/cart/clear", authenticateToken, asyncHandler(cartController.clear));
router.delete("/cart", authenticateToken, asyncHandler(cartController.clear));
router.post("/cart/apply-promo", authenticateToken, asyncHandler(cartController.applyPromo));
router.post("/cart/remove-promocode", authenticateToken, asyncHandler(cartController.removePromo));
router.post("/cart/select-delivery", authenticateToken, asyncHandler(cartController.selectDelivery));

export default router;
