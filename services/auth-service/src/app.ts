import { createServiceApp } from "@shared/http/create-service-app";
import routes from "./routes";

export default createServiceApp({
  serviceName: "auth-service",
  routes,
  routeAliases: ["/api/v1/auth", "/api/auth", "/auth"],
});
