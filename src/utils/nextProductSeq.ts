import Counter from "../../models/Counter";

export async function nextProductSeq(sellerId: string): Promise<number> {
  const doc = await Counter.findOneAndUpdate(
    { scope: `seller:${sellerId}:product` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
}
