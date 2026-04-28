import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import { env } from "./config/env";
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/users/user.routes";
import roleRoutes from "./modules/roles/role.routes";
import brandRoutes from "./modules/brands/brand.routes";
import categoryRoutes from "./modules/categories/category.routes";
import productRoutes from "./modules/products/product.routes";
import reviewRoutes from "./modules/reviews/review.routes";
import wishlistRoutes from "./modules/wishlist/wishlist.routes";
import cartRoutes from "./modules/cart/cart.routes";
import checkoutRoutes from "./modules/checkout/checkout.routes";
import orderRoutes from "./modules/orders/order.routes";
import paymentRoutes from "./modules/payments/payment.routes";
import sidebarItemRoute from "./main/routes/sidebaritems";
import promocodeRoute from "./main/routes/promocode";
import deliveryRoute from "./main/routes/delivery";
import { errorMiddleware, notFoundMiddleware } from "./common/middlewares/error.middleware";

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: env.corsOrigin, credentials: true }));

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] PID: ${process.pid}, Path: ${req.path}`);
  next();
});

if (env.proxyTarget) {
  app.use(
    "/proxy",
    createProxyMiddleware({
      target: env.proxyTarget,
      changeOrigin: true,
      pathRewrite: { "^/proxy": "" },
    })
  );
}

app.get("/debug", (_req, res) => {
  res.json({
    instance: `PM2 ID: ${process.env.pm2_id || "unknown"}`,
    pid: process.pid,
    port: env.port,
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/v1", authRoutes);
app.use("/api/v1", userRoutes);
app.use("/api/v1", roleRoutes);
app.use("/api/v1", brandRoutes);
app.use("/api/v1", categoryRoutes);
app.use("/api/v1", productRoutes);
app.use("/api/v1", reviewRoutes);
app.use("/api/v1", wishlistRoutes);
app.use("/api/v1", cartRoutes);
app.use("/api/v1", checkoutRoutes);
app.use("/api/v1", orderRoutes);
app.use("/api/v1", paymentRoutes);

// Legacy modules that are outside this refactor scope.
app.use("/api/v1", sidebarItemRoute);
app.use("/api/v1", promocodeRoute);
app.use("/api/v1", deliveryRoute);

app.use("/uploads", express.static("uploads"));
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
