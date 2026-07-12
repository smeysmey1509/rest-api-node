import { Request, Response } from "express";
import { brandService } from "./brand.service";

export const brandController = {
  async list(req: Request, res: Response) {
    const result = await brandService.list(req.query as Record<string, unknown>);
    res.status(200).json(result);
  },

  async create(req: Request, res: Response) {
    const brand = await brandService.create(req.body || {});
    res.status(201).json(brand);
  },

  async update(req: Request, res: Response) {
    const brand = await brandService.update(String(req.params.id), req.body || {});
    res.status(200).json(brand);
  },

  async remove(req: Request, res: Response) {
    const result = await brandService.remove(String(req.params.id));
    res.status(200).json(result);
  },
};
