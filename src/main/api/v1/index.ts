import { Router } from "express";
import { v1Routes } from "./routes";

export function createV1Router(): Router {
  const router = Router();
  v1Routes.forEach((route) => router.use("/", route));
  return router;
}
