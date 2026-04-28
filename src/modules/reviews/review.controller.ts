import { Response } from "express";
import { AuthenticatedRequest } from "../../common/middlewares/auth.middleware";
import { reviewService } from "./review.service";

export const reviewController = {
  async listApproved(req: AuthenticatedRequest, res: Response) {
    const reviews = await reviewService.listApproved(req.params.productId);
    res.status(200).json({ reviews });
  },

  async create(req: AuthenticatedRequest, res: Response) {
    const result = await reviewService.create(String(req.user?.id || ""), req.body || {});
    res.status(201).json(result);
  },

  async approve(req: AuthenticatedRequest, res: Response) {
    const review = await reviewService.approve(req.params.id);
    res.status(200).json(review);
  },

  async remove(req: AuthenticatedRequest, res: Response) {
    const result = await reviewService.remove(req.params.id);
    res.status(200).json(result);
  },
};
