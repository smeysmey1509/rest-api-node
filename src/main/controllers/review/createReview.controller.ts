// src/main/controllers/review/createReview.controller.ts
import { Response } from "express";
import Review from "../../../models/Review";
import { applyNewRating } from "../../services/rating.service";
import { AuthenicationRequest } from "../../../middleware/auth";

export const createReview = async (req: AuthenicationRequest, res: Response) => {
  const { productId, rating, title, body } = req.body;
  if (!productId) return res.status(400).json({ error: "productId required" });
  const r = Number(rating);
  if (!Number.isFinite(r) || r < 1 || r > 5) return res.status(400).json({ error: "rating 1..5" });

  // One review per user per product
  const exists = await Review.findOne({ product: productId, user: req.user?.id }).lean();
  if (exists) return res.status(409).json({ error: "You already reviewed this product" });

  const review = await Review.create({
    product: productId,
    user: req.user?.id,
    rating: r,
    title,
    body,
  });

  await applyNewRating(productId, r);

  res.status(201).json({ msg: "Review created", review });
};
