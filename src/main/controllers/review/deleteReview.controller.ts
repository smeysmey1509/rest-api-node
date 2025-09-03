// src/main/controllers/review/deleteReview.controller.ts
import { Response } from "express";
import Review from "../../../models/Review";
import { removeRating } from "../../services/rating.service";
import { AuthenicationRequest } from "../../../middleware/auth";

export const deleteReview = async (req: AuthenicationRequest, res: Response) => {
  const { reviewId } = req.params;
  const review = await Review.findOne({ _id: reviewId, user: req.user?.id });
  if (!review) return res.status(404).json({ error: "Review not found" });

  const productId = String(review.product);
  const oldRating = review.rating;

  await review.deleteOne();
  await removeRating(productId, oldRating);

  res.json({ msg: "Review deleted" });
};
