import axios from "axios";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { env } from "@shared/config/env";
import { errorMiddleware, notFoundMiddleware } from "@shared/middlewares/error.middleware";
import { resolveWorkspacePath } from "@shared/runtime/paths";

const app = express();

const withApiPrefixes = (paths: string[]) =>
  paths.flatMap((servicePath) => [`/api/v1${servicePath}`, `/api${servicePath}`]);

const serviceTargets = {
  auth: env.services.auth,
  user: env.services.user,
  catalog: env.services.catalog,
  inventory: env.services.inventory,
  order: env.services.order,
  payment: env.services.payment,
};

const proxyGroups = [
  {
    name: "auth-service",
    target: serviceTargets.auth,
    paths: withApiPrefixes(["/auth", "/register", "/login", "/refresh", "/logout", "/roles"]),
  },
  {
    name: "user-service",
    target: serviceTargets.user,
    paths: withApiPrefixes(["/me", "/profile", "/users"]),
  },
  {
    name: "catalog-service",
    target: serviceTargets.catalog,
    paths: withApiPrefixes([
      "/brands",
      "/categories",
      "/category",
      "/products",
      "/product",
      "/product-variants",
      "/reviews",
      "/wishlist",
      "/sidebar-items",
      "/sidebar-tree",
    ]),
  },
  {
    name: "inventory-service",
    target: serviceTargets.inventory,
    paths: withApiPrefixes([
      "/inventory-units",
      "/inventory-movements",
      "/stock-locations",
      "/suppliers",
      "/delivery",
    ]),
  },
  {
    name: "order-service",
    target: serviceTargets.order,
    paths: withApiPrefixes(["/cart", "/checkout", "/orders", "/admin/orders", "/promocode"]),
  },
  {
    name: "payment-service",
    target: serviceTargets.payment,
    paths: withApiPrefixes(["/payments"]),
  },
];

const matchesProxyPath = (pathname: string, paths: string[]) =>
  paths.some((proxyPath) => pathname === proxyPath || pathname.startsWith(`${proxyPath}/`));

const checkDownstreamService = async (name: string, target: string) => {
  try {
    const response = await axios.get<{ data?: unknown }>(`${target}/health`, { timeout: 2000 });

    return {
      name,
      target,
      status: "ok",
      statusCode: response.status,
      data: response.data?.data,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown health check error";

    return {
      name,
      target,
      status: "error",
      error: message,
    };
  }
};

app.use(cookieParser());
app.use(cors({ origin: env.corsOrigin, credentials: true }));

app.get(["/health", "/api/health", "/api/v1/health"], async (_req, res) => {
  const services = await Promise.all(
    Object.entries(serviceTargets).map(([name, target]) => checkDownstreamService(name, target)),
  );
  const healthy = services.every((service) => service.status === "ok");

  res.status(healthy ? 200 : 503).json({
    success: healthy,
    message: healthy ? "Gateway and downstream services are healthy" : "One or more services are unhealthy",
    data: {
      status: healthy ? "ok" : "degraded",
      service: "api-gateway",
      timestamp: new Date().toISOString(),
      services,
    },
  });
});

proxyGroups.forEach(({ name, target, paths }) => {
  app.use(
    createProxyMiddleware({
      target,
      changeOrigin: true,
      xfwd: true,
      pathFilter: (pathname) => matchesProxyPath(pathname, paths),
      on: {
        error(error, _req, res) {
          console.error(`[api-gateway] ${name} proxy error:`, error);
          if ("writeHead" in res) {
            res.writeHead(502, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, message: `${name} is unavailable` }));
          }
        },
      },
    }),
  );
});

app.use("/uploads", express.static(resolveWorkspacePath("uploads")));
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
