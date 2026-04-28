import { Router } from "express";
import { authenticateToken } from "../../common/middlewares/auth.middleware";
import { asyncHandler } from "../../common/middlewares/async-handler.middleware";
import { wishlistController } from "./wishlist.controller";

const router = Router();

router.get("/wishlist", authenticateToken, asyncHandler(wishlistController.get));
router.post("/wishlist/move-to-cart", authenticateToken, asyncHandler(wishlistController.moveToCart));
router.post("/wishlist/:productId", authenticateToken, asyncHandler(wishlistController.add));
router.post("/wishlist", authenticateToken, asyncHandler(wishlistController.add));
router.delete("/wishlist/:productId", authenticateToken, asyncHandler(wishlistController.remove));

export default router;
