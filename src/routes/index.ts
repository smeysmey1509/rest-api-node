import { Router } from "express";
import authRoutes from "../modules/auth/auth.route";
import userRoutes from "../modules/users/user.route";
import roleRoutes from "../modules/roles/role.route";
import brandRoutes from "../modules/brands/brand.route";
import categoryRoutes from "../modules/categories/category.route";
import productRoutes from "../modules/products/product.route";
import reviewRoutes from "../modules/reviews/review.route";
import wishlistRoutes from "../modules/wishlist/wishlist.route";
import cartRoutes from "../modules/cart/cart.route";
import checkoutRoutes from "../modules/checkout/checkout.route";
import orderRoutes from "../modules/orders/order.route";
import paymentRoutes from "../modules/payments/payment.route";
import couponRoutes from "../modules/coupons/coupon.route";
import inventoryRoutes from "../modules/inventory/delivery.route";
import reportRoutes from "../modules/reports/sidebar-items.route";

const router = Router();

router.use(authRoutes);
router.use(userRoutes);
router.use(roleRoutes);
router.use(brandRoutes);
router.use(categoryRoutes);
router.use(productRoutes);
router.use(reviewRoutes);
router.use(wishlistRoutes);
router.use(cartRoutes);
router.use(checkoutRoutes);
router.use(orderRoutes);
router.use(paymentRoutes);
router.use(couponRoutes);
router.use(inventoryRoutes);
router.use(reportRoutes);

export default router;
