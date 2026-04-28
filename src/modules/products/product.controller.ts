import { Response } from "express";
import { AuthenticatedRequest } from "../../common/middlewares/auth.middleware";
import { productService } from "./product.service";

const getFiles = (req: AuthenticatedRequest) =>
  Array.isArray(req.files) ? req.files : undefined;

export const productController = {
  async list(req: AuthenticatedRequest, res: Response) {
    const result = await productService.list(req.query as Record<string, unknown>, req.user?.role);
    res.status(200).json(result);
  },

  async listRaw(req: AuthenticatedRequest, res: Response) {
    const result = await productService.listRaw(req.query as Record<string, unknown>, req.user?.role);
    res.status(200).json(result);
  },

  async search(req: AuthenticatedRequest, res: Response) {
    const result = await productService.search(req.query as Record<string, unknown>, req.user?.role);
    res.status(200).json(result);
  },

  async get(req: AuthenticatedRequest, res: Response) {
    const product = await productService.getByIdOrSlug(req.params.id || req.params.idOrSlug);
    res.status(200).json(product);
  },

  async create(req: AuthenticatedRequest, res: Response) {
    const product = await productService.create(req.body || {}, getFiles(req), req.user?.id);
    res.status(201).json(product);
  },

  async update(req: AuthenticatedRequest, res: Response) {
    const product = await productService.update(req.params.id, req.body || {}, getFiles(req));
    res.status(200).json(product);
  },

  async remove(req: AuthenticatedRequest, res: Response) {
    const result = await productService.remove(req.params.id);
    res.status(200).json(result);
  },

  async removeMany(req: AuthenticatedRequest, res: Response) {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const result = await productService.removeMany(ids);
    res.status(200).json(result);
  },

  async recommendations(req: AuthenticatedRequest, res: Response) {
    const result = await productService.recommendations(req.params.id);
    res.status(200).json(result);
  },
};
