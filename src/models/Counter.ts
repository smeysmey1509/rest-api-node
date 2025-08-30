// models/Counter.ts
import { Schema, model, Document } from "mongoose";
interface ICounter extends Document { scope: string; seq: number; }
const CounterSchema = new Schema<ICounter>({ scope: { type: String, unique: true }, seq: { type: Number, default: 0 }});
const Counter = model<ICounter>("Counter", CounterSchema);
export default Counter;

// helper
export async function nextSeqForSeller(sellerId: string): Promise<number> {
  const doc = await Counter.findOneAndUpdate(
    { scope: `seller:${sellerId}:product` },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return doc.seq;
}