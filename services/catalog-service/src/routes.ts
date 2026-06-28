import { Router } from "express";
import brandRoutes from "./modules/brands/brand.route";
import categoryRoutes from "./modules/categories/category.route";
import productRoutes from "./modules/products/product.route";
import productVariantRoutes from "./modules/product-variants/product-variant.route";
import reportRoutes from "./modules/reports/sidebar-items.route";
import reviewRoutes from "./modules/reviews/review.route";
import wishlistRoutes from "./modules/wishlist/wishlist.route";

const router = Router();

router.use(brandRoutes);
router.use(categoryRoutes);
router.use(productRoutes);
router.use(productVariantRoutes);
router.use(reviewRoutes);
router.use(wishlistRoutes);
router.use(reportRoutes);

export default router;
