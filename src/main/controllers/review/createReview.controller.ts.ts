// src/main/controllers/review/createReview.controller.ts
import { RequestHandler } from "express";
import mongoose from "mongoose";
import Review from "../../../models/Review";
import Product from "../../../models/Product";
import { applyNewRating } from "../../services/rating.service";
import { AuthenicationRequest } from "../../../middleware/auth";

export const createReview: RequestHandler = async (req, res) => {
  try {
    const { productId, rating, title, body } = req.body;

    // get user from your auth-augmented request
    const { user } = req as AuthenicationRequest;
    if (!user?.id) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!productId || !mongoose.isValidObjectId(productId)) {
      res.status(400).json({ error: "Valid productId is required" });
      return;
    }

    const r = Number(rating);
    if (!Number.isFinite(r) || r < 1 || r > 5) {
      res.status(400).json({ error: "rating must be between 1 and 5" });
      return;
    }

    const product = await Product.findById(productId).select("_id");
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    const review = await Review.create({
      product: productId,
      user: user.id,
      rating: r,
      title: typeof title === "string" ? title : undefined,
      body: typeof body === "string" ? body : undefined,
    });

    await applyNewRating(productId, r);

    const updated = await Product.findById(productId).select("ratingAvg ratingCount");

    res.status(201).json({
      msg: "Review created",
      review,
      productRating: {
        ratingAvg: updated?.ratingAvg ?? 0,
        ratingCount: updated?.ratingCount ?? 0,
      },
    });
  } catch (err: any) {
    if (err?.code === 11000) {
      res.status(409).json({ error: "You already reviewed this product" });
      return;
    }
    console.error("createReview error:", err?.message, err?.stack);
    res.status(400).json({ error: "Failed to create review" });
  }
};
