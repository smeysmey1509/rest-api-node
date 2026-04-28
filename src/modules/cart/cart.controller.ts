import { Response } from "express";
import { AuthenticatedRequest } from "../../common/middlewares/auth.middleware";
import { cartService } from "./cart.service";

const requireUserId = (req: AuthenticatedRequest) => String(req.user?.id || "");

export const cartController = {
  async get(req: AuthenticatedRequest, res: Response) {
    const cart = await cartService.get(requireUserId(req));
    res.status(200).json(cart);
  },

  async add(req: AuthenticatedRequest, res: Response) {
    const cart = await cartService.add(requireUserId(req), req.body.productId, req.body.quantity);
    res.status(200).json(cart);
  },

  async remove(req: AuthenticatedRequest, res: Response) {
    const cart = await cartService.remove(requireUserId(req), req.body.productId || req.params.productId);
    res.status(200).json(cart);
  },

  async updateQuantity(req: AuthenticatedRequest, res: Response) {
    const cart = await cartService.updateQuantity(requireUserId(req), req.params.productId, Number(req.body.quantity));
    res.status(200).json(cart);
  },

  async clear(req: AuthenticatedRequest, res: Response) {
    const result = await cartService.clear(requireUserId(req));
    res.status(200).json(result);
  },

  async applyPromo(req: AuthenticatedRequest, res: Response) {
    const result = await cartService.applyPromo(requireUserId(req), req.body.code);
    res.status(200).json(result);
  },

  async removePromo(req: AuthenticatedRequest, res: Response) {
    const result = await cartService.removePromo(requireUserId(req));
    res.status(200).json(result);
  },

  async selectDelivery(req: AuthenticatedRequest, res: Response) {
    const result = await cartService.selectDelivery(requireUserId(req), req.body.method);
    res.status(200).json(result);
  },
};
