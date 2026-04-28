import { Request, Response } from "express";
import { paymentService } from "./payment.service";

export const paymentController = {
  async get(req: Request, res: Response) {
    const payment = await paymentService.getById(req.params.id);
    res.status(200).json(payment);
  },

  async verify(req: Request, res: Response) {
    const payment = await paymentService.verifyPayment(req.params.id);
    res.status(200).json(payment);
  },

  async confirmManual(req: Request, res: Response) {
    const payment = await paymentService.markManualSuccess(req.params.id);
    res.status(200).json(payment);
  },
};
