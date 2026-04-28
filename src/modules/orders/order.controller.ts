import { Response } from "express";
import { AuthenticatedRequest } from "../../common/middlewares/auth.middleware";
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
    const order = await orderService.cancel(String(req.user?.id || ""), req.params.id);
    res.status(200).json(order);
  },

  async updateStatus(req: AuthenticatedRequest, res: Response) {
    const order = await orderService.updateStatus(req.params.id, req.body.status);
    res.status(200).json(order);
  },
};
