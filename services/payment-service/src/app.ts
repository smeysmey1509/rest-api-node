import { createServiceApp } from "@shared/http/create-service-app";
import routes from "./routes";

export default createServiceApp({
  serviceName: "payment-service",
  routes,
});
