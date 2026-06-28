import { Response } from "express";
import { AuthenticatedRequest } from "@shared/middlewares/auth.middleware";
import { productVariantService } from "./product-variant.service";

export const productVariantController = {
  async listByProduct(req: AuthenticatedRequest, res: Response) {
    const variants = await productVariantService.listByProduct(req.params.productId);
    res.status(200).json({ variants });
  },

  async create(req: AuthenticatedRequest, res: Response) {
    const variant = await productVariantService.create(req.params.productId, req.body || {});
    res.status(201).json(variant);
  },

  async update(req: AuthenticatedRequest, res: Response) {
    const variant = await productVariantService.update(req.params.variantId, req.body || {});
    res.status(200).json(variant);
  },

  async remove(req: AuthenticatedRequest, res: Response) {
    const result = await productVariantService.remove(req.params.variantId);
    res.status(200).json(result);
  },
};
