import { Response } from "express";
import { AuthenticatedRequest } from "../../shared/middlewares/auth.middleware";
import { inventoryUnitService } from "./inventory-unit.service";

export const inventoryUnitController = {
  async list(req: AuthenticatedRequest, res: Response) {
    res.status(200).json({ units: await inventoryUnitService.list(req.query as Record<string, unknown>) });
  },
  async get(req: AuthenticatedRequest, res: Response) {
    res.status(200).json(await inventoryUnitService.get(req.params.id));
  },
  async stockIn(req: AuthenticatedRequest, res: Response) {
    res.status(201).json(await inventoryUnitService.stockIn(req.body || {}, req.user?.id));
  },
  async reserve(req: AuthenticatedRequest, res: Response) {
    res.status(200).json(await inventoryUnitService.reserve(req.body || {}, req.user?.id));
  },
  async release(req: AuthenticatedRequest, res: Response) {
    res.status(200).json(await inventoryUnitService.release(req.body || {}, req.user?.id));
  },
  async sell(req: AuthenticatedRequest, res: Response) {
    res.status(200).json(await inventoryUnitService.sell(req.body || {}, req.user?.id));
  },
  async returnUnit(req: AuthenticatedRequest, res: Response) {
    res.status(200).json(await inventoryUnitService.returnUnit(req.body || {}, req.user?.id));
  },
  async search(req: AuthenticatedRequest, res: Response) {
    res.status(200).json({ units: await inventoryUnitService.search(req.query as Record<string, unknown>) });
  },
};
