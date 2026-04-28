import { Response } from "express";
import { AuthenticatedRequest } from "../../common/middlewares/auth.middleware";
import { checkoutService } from "./checkout.service";

export const checkoutController = {
  async checkout(req: AuthenticatedRequest, res: Response) {
    const result = await checkoutService.checkout(String(req.user?.id || ""), req.body || {});
    res.status(201).json(result);
  },
};
