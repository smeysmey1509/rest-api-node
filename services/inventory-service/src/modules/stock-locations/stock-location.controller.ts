import { Response } from "express";
import { AuthenticatedRequest } from "@shared/middlewares/auth.middleware";
import { stockLocationService } from "./stock-location.service";

export const stockLocationController = {
  async list(_req: AuthenticatedRequest, res: Response) {
    res.status(200).json({ locations: await stockLocationService.list() });
  },
  async get(req: AuthenticatedRequest, res: Response) {
    res.status(200).json(await stockLocationService.get(String(req.params.id)));
  },
  async create(req: AuthenticatedRequest, res: Response) {
    res.status(201).json(await stockLocationService.create(req.body || {}));
  },
  async update(req: AuthenticatedRequest, res: Response) {
    res.status(200).json(await stockLocationService.update(String(req.params.id), req.body || {}));
  },
  async remove(req: AuthenticatedRequest, res: Response) {
    res.status(200).json(await stockLocationService.remove(String(req.params.id)));
  },
};
