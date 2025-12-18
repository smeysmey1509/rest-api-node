import { Router } from "express";
import { createV1Router } from "./v1";

export function createApiRouter(): Router {
  const router = Router();
  router.use("/v1", createV1Router());
  return router;
}
