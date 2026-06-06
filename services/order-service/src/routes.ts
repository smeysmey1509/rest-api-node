import { Router } from "express";
import cartRoutes from "./modules/cart/cart.route";
import checkoutRoutes from "./modules/checkout/checkout.route";
import couponRoutes from "./modules/coupons/coupon.route";
import orderRoutes from "./modules/orders/order.route";

const router = Router();

router.use(cartRoutes);
router.use(checkoutRoutes);
router.use(orderRoutes);
router.use(couponRoutes);

export default router;
