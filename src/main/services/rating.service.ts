// services/rating.service.ts
import Product from "../../models/Product";

export async function applyNewRating(productId: string, value: number) {
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

export async function replaceRating(productId: string, oldValue: number, newValue: number) {
  const p = await Product.findById(productId).select("ratingAvg ratingCount").lean();
  if (!p) throw new Error("Product not found");
  const count = p.ratingCount ?? 0;
  const avg   = p.ratingAvg ?? 0;
  if (count <= 0) return;

  const total   = (avg * count) - oldValue + newValue;
  const newAvg  = total / count;

  await Product.updateOne(
    { _id: productId },
    { $set: { ratingAvg: Number(newAvg.toFixed(2)) } }
  );
}

export async function removeRating(productId: string, value: number) {
  const p = await Product.findById(productId).select("ratingAvg ratingCount").lean();
  if (!p) throw new Error("Product not found");
  const count = p.ratingCount ?? 0;
  const avg   = p.ratingAvg ?? 0;
  if (count <= 1) {
    await Product.updateOne({ _id: productId }, { $set: { ratingAvg: 0, ratingCount: 0 } });
    return;
  }

  const newCount = count - 1;
  const newAvg   = ((avg * count) - value) / newCount;

  await Product.updateOne(
    { _id: productId },
    { $set: { ratingAvg: Number(newAvg.toFixed(2)) }, $inc: { ratingCount: -1 } }
  );
}
