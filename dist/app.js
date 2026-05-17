"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const http_proxy_middleware_1 = require("http-proxy-middleware");
const env_1 = require("./config/env");
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const user_routes_1 = __importDefault(require("./modules/users/user.routes"));
const role_routes_1 = __importDefault(require("./modules/roles/role.routes"));
const brand_routes_1 = __importDefault(require("./modules/brands/brand.routes"));
const category_routes_1 = __importDefault(require("./modules/categories/category.routes"));
const product_routes_1 = __importDefault(require("./modules/products/product.routes"));
const review_routes_1 = __importDefault(require("./modules/reviews/review.routes"));
const wishlist_routes_1 = __importDefault(require("./modules/wishlist/wishlist.routes"));
const cart_routes_1 = __importDefault(require("./modules/cart/cart.routes"));
const checkout_routes_1 = __importDefault(require("./modules/checkout/checkout.routes"));
const order_routes_1 = __importDefault(require("./modules/orders/order.routes"));
const payment_routes_1 = __importDefault(require("./modules/payments/payment.routes"));
const sidebaritems_1 = __importDefault(require("./main/routes/sidebaritems"));
const promocode_1 = __importDefault(require("./main/routes/promocode"));
const delivery_1 = __importDefault(require("./main/routes/delivery"));
const error_middleware_1 = require("./common/middlewares/error.middleware");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)({ origin: env_1.env.corsOrigin, credentials: true }));
app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] PID: ${process.pid}, Path: ${req.path}`);
    next();
});
if (env_1.env.proxyTarget) {
    app.use("/proxy", (0, http_proxy_middleware_1.createProxyMiddleware)({
        target: env_1.env.proxyTarget,
        changeOrigin: true,
        pathRewrite: { "^/proxy": "" },
    }));
}
app.get("/debug", (_req, res) => {
    res.json({
        instance: `PM2 ID: ${process.env.pm2_id || "unknown"}`,
        pid: process.pid,
        port: env_1.env.port,
        timestamp: new Date().toISOString(),
    });
});
app.use("/api/v1", auth_routes_1.default);
app.use("/api/v1", user_routes_1.default);
app.use("/api/v1", role_routes_1.default);
app.use("/api/v1", brand_routes_1.default);
app.use("/api/v1", category_routes_1.default);
app.use("/api/v1", product_routes_1.default);
app.use("/api/v1", review_routes_1.default);
app.use("/api/v1", wishlist_routes_1.default);
app.use("/api/v1", cart_routes_1.default);
app.use("/api/v1", checkout_routes_1.default);
app.use("/api/v1", order_routes_1.default);
app.use("/api/v1", payment_routes_1.default);
// Legacy modules that are outside this refactor scope.
app.use("/api/v1", sidebaritems_1.default);
app.use("/api/v1", promocode_1.default);
app.use("/api/v1", delivery_1.default);
app.use("/uploads", express_1.default.static("uploads"));
app.use(error_middleware_1.notFoundMiddleware);
app.use(error_middleware_1.errorMiddleware);
exports.default = app;
