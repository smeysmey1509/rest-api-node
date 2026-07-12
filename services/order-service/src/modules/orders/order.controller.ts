import { Response } from "express";
import { AuthenticatedRequest } from "@shared/middlewares/auth.middleware";
import { orderService } from "./order.service";

export const orderController = {
  async mine(req: AuthenticatedRequest, res: Response) {
    const orders = await orderService.listMine(String(req.user?.id || ""));
    res.status(200).json({ orders });
  },

  async all(_req: AuthenticatedRequest, res: Response) {
    const orders = await orderService.listAll();
    res.status(200).json({ orders });
  },

  async cancel(req: AuthenticatedRequest, res: Response) {
    const order = await orderService.cancel(String(req.user?.id || ""), String(req.params.id));
    res.status(200).json(order);
  },

  async updateStatus(req: AuthenticatedRequest, res: Response) {
    const order = await orderService.updateStatus(String(req.params.id), req.body.status);
    res.status(200).json(order);
  },
};
