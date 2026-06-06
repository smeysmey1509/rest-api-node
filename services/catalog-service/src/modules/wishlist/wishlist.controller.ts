import { Response } from "express";
import { AuthenticatedRequest } from "@shared/middlewares/auth.middleware";
import { wishlistService } from "./wishlist.service";

const requireUserId = (req: AuthenticatedRequest) => String(req.user?.id || "");

export const wishlistController = {
  async get(req: AuthenticatedRequest, res: Response) {
    const result = await wishlistService.get(requireUserId(req), req.query as Record<string, unknown>);
    res.status(200).json(result);
  },

  async add(req: AuthenticatedRequest, res: Response) {
    const result = await wishlistService.add(requireUserId(req), req.params.productId || req.body.productId);
    res.status(201).json(result);
  },

  async remove(req: AuthenticatedRequest, res: Response) {
    const result = await wishlistService.remove(requireUserId(req), req.params.productId || req.body.productId);
    res.status(200).json(result);
  },

  async moveToCart(req: AuthenticatedRequest, res: Response) {
    const result = await wishlistService.moveToCart(requireUserId(req), req.body.productId, req.body.quantity);
    res.status(200).json(result);
  },
};
