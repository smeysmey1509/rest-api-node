import { Response } from "express";
import { AuthenticatedRequest } from "@shared/middlewares/auth.middleware";
import { supplierService } from "./supplier.service";

export const supplierController = {
  async list(_req: AuthenticatedRequest, res: Response) {
    res.status(200).json({ suppliers: await supplierService.list() });
  },
  async get(req: AuthenticatedRequest, res: Response) {
    res.status(200).json(await supplierService.get(req.params.id));
  },
  async create(req: AuthenticatedRequest, res: Response) {
    res.status(201).json(await supplierService.create(req.body || {}));
  },
  async update(req: AuthenticatedRequest, res: Response) {
    res.status(200).json(await supplierService.update(req.params.id, req.body || {}));
  },
  async remove(req: AuthenticatedRequest, res: Response) {
    res.status(200).json(await supplierService.remove(req.params.id));
  },
};
