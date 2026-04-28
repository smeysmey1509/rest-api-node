import { Request, Response } from "express";
import { categoryService } from "./category.service";

export const categoryController = {
  async list(req: Request, res: Response) {
    const result = await categoryService.list(req.query as Record<string, unknown>);
    res.status(200).json(result);
  },

  async listRaw(req: Request, res: Response) {
    const result = await categoryService.listRaw(req.query as Record<string, unknown>);
    res.status(200).json(result);
  },

  async get(req: Request, res: Response) {
    const category = await categoryService.getById(req.params.id);
    res.status(200).json(category);
  },

  async create(req: Request, res: Response) {
    const category = await categoryService.create(req.body || {});
    res.status(201).json({ msg: "Category created.", category });
  },

  async update(req: Request, res: Response) {
    const category = await categoryService.update(req.params.id, req.body || {});
    res.status(200).json(category);
  },

  async remove(req: Request, res: Response) {
    const result = await categoryService.remove(req.params.id);
    res.status(200).json(result);
  },
};
