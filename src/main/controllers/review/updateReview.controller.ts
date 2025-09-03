// src/main/controllers/review/updateReview.controller.ts
import { Response } from "express";
import Review from "../../../models/Review";
import { replaceRating } from "../../services/rating.service";
import { AuthenicationRequest } from "../../../middleware/auth";

export const updateReview = async (req: AuthenicationRequest, res: Response) => {
  const { reviewId } = req.params;
  const { rating, title, body } = req.body;

  const review = await Review.findOne({ _id: reviewId, user: req.user?.id });
  if (!review) return res.status(404).json({ error: "Review not found" });

  const oldRating = review.rating;
  if (rating != null) {
    const r = Number(rating);
    if (!Number.isFinite(r) || r < 1 || r > 5) return res.status(400).json({ error: "rating 1..5" });
    review.rating = r;
  }
  if (title != null) review.title = title;
  if (body != null) review.body = body;

  await review.save();
  if (rating != null) await replaceRating(String(review.product), oldRating, review.rating);

  res.json({ msg: "Review updated", review });
};
