import { Schema, model, Document } from "mongoose";

interface ICounter extends Document {
  scope: string; // e.g. "seller:123"
  seq: number;
}

const CounterSchema = new Schema<ICounter>({
  scope: { type: String, unique: true, required: true },
  seq: { type: Number, default: 0 },
});

export default model<ICounter>("Counter", CounterSchema);
