// one-off script or admin endpoint
import mongoose from "mongoose";
import "../../packages/shared/src/register-paths";
import Review from "@services/catalog-service/src/modules/reviews/review.model";
import Product from "@services/catalog-service/src/modules/products/product.model";

export async function recomputeAllRatings(productId: string) {
  const agg = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: "$product",
        avg: { $avg: "$rating" },
        cnt: { $sum: 1 },
      },
    },
  ]);
  const row = agg[0];
  const avg = row ? Number(row.avg.toFixed(2)) : 0;
  const cnt = row ? row.cnt : 0;
  await Product.updateOne({ _id: productId }, { $set: { ratingAvg: avg, ratingCount: cnt } });
}
