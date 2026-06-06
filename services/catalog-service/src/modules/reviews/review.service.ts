import mongoose from "mongoose";
import Product from "../products/product.model";
import Order from "@services/order-service/src/modules/orders/order.model";
import Review from "./review.model";
import { AppError } from "@shared/errors/app-error";
import { reviewRepository } from "./review.repository";

const paidStatuses = [
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "paid",
  "processing",
  "shipped",
  "delivered",
];

const recomputeProductRating = async (productId: string) => {
  const rows = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId), status: "APPROVED" } },
    { $group: { _id: "$product", avg: { $avg: "$rating" }, count: { $sum: 1 }, sum: { $sum: "$rating" } } },
  ]);
  const stats = rows[0] || { avg: 0, count: 0, sum: 0 };
  await Product.updateOne(
    { _id: productId },
    {
      ratingAvg: Number((stats.avg || 0).toFixed(2)),
      ratingCount: stats.count || 0,
      ratingSum: stats.sum || 0,
    } as any
  );
};

export const reviewService = {
  listApproved(productId: string) {
    return reviewRepository.listApprovedByProduct(productId);
  },

  async create(userId: string, payload: Record<string, unknown>) {
    const productId = String(payload.productId || payload.product || "");
    if (!productId || !mongoose.isValidObjectId(productId)) {
      throw new AppError("Valid productId is required", 400);
    }

    const rating = Number(payload.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      throw new AppError("rating must be between 1 and 5", 400);
    }

    const product = await Product.findById(productId).select("_id");
    if (!product) throw new AppError("Product not found", 404);

    const purchased = await Order.exists({
      user: userId,
      "items.product": productId,
      status: { $in: paidStatuses },
    });
    if (!purchased) {
      throw new AppError("Only purchased products can be reviewed.", 403);
    }

    try {
      const review = await reviewRepository.create({
        product: productId,
        user: userId,
        rating,
        title: typeof payload.title === "string" ? payload.title : undefined,
        body:
          typeof payload.body === "string"
            ? payload.body
            : typeof payload.comment === "string"
            ? payload.comment
            : undefined,
        comment: typeof payload.comment === "string" ? payload.comment : undefined,
        isVerifiedPurchase: true,
        status: "PENDING",
      });
      return { msg: "Review created", review };
    } catch (err: any) {
      if (err?.code === 11000) throw new AppError("You already reviewed this product", 409);
      throw err;
    }
  },

  async approve(id: string) {
    const review = await reviewRepository.findById(id);
    if (!review) throw new AppError("Review not found", 404);
    review.status = "APPROVED";
    await review.save();
    await recomputeProductRating(String(review.product));
    return review;
  },

  async remove(id: string) {
    const review = await reviewRepository.delete(id);
    if (!review) throw new AppError("Review not found", 404);
    await recomputeProductRating(String(review.product));
    return { msg: "Review deleted successfully." };
  },
};
