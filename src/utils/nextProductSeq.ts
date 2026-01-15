import Counter from "../models/Counter";

export async function nextProductSeq(sellerId: string): Promise<number> {
  const normalizedSellerId = String(sellerId || "").trim();
  if (!normalizedSellerId) {
    throw new Error("sellerId is required to increment product sequence");
  }

  const scope = `seller:${normalizedSellerId}:product`;
  const doc = await Counter.findOneAndUpdate(
    { scope },
    { $inc: { seq: 1 }, $setOnInsert: { scope, seq: 0 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  if (!doc || !Number.isFinite(doc.seq)) {
    const fallback = await Counter.findOneAndUpdate(
      { scope },
      { $set: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
    return fallback?.seq ?? 1;
  }

  return doc.seq;
}
