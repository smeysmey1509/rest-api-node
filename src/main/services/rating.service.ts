// src/main/services/rating.service.ts
import Product from "../../models/Product";

export async function applyNewRating(productId: string, value: number) {
  // Read current snapshot
  const p = await Product.findById(productId).select("ratingAvg ratingCount").lean();
  if (!p) throw new Error("Product not found");

  const count = p.ratingCount ?? 0;
  const avg   = p.ratingAvg ?? 0;

  const newCount = count + 1;
  const newAvg   = ((avg * count) + value) / newCount;

  await Product.updateOne(
    { _id: productId },
    { $set: { ratingAvg: Number(newAvg.toFixed(2)) }, $inc: { ratingCount: 1 } }
  );
}
