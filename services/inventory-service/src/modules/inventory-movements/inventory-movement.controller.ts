import { Response } from "express";
import { AuthenticatedRequest } from "@shared/middlewares/auth.middleware";
import { inventoryMovementService } from "./inventory-movement.service";

export const inventoryMovementController = {
  async list(req: AuthenticatedRequest, res: Response) {
    res.status(200).json({ movements: await inventoryMovementService.list(req.query as Record<string, unknown>) });
  },
  async byUnit(req: AuthenticatedRequest, res: Response) {
    res.status(200).json({ movements: await inventoryMovementService.byUnit(req.params.inventoryUnitId) });
  },
  async byVariant(req: AuthenticatedRequest, res: Response) {
    res.status(200).json({ movements: await inventoryMovementService.byVariant(req.params.variantId) });
  },
};
