import mongoose, { InferSchemaType, Model } from "mongoose";

const IdentifierCounterSchema = new mongoose.Schema(
  {
    scope: { type: String, required: true, unique: true, immutable: true, trim: true },
    value: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true, collection: "identifier_counters" },
);

type IdentifierCounter = InferSchemaType<typeof IdentifierCounterSchema>;

const IdentifierCounterModel = (mongoose.models.IdentifierCounter as Model<IdentifierCounter>) ||
  mongoose.model<IdentifierCounter>("IdentifierCounter", IdentifierCounterSchema);

export type IdentifierDatePrecision = "month" | "day";

export type GenerateIdentifierOptions = {
  prefix: string;
  date?: Date;
  precision?: IdentifierDatePrecision;
  digits?: number;
  session?: mongoose.ClientSession;
};

const datePart = (date: Date, precision: IdentifierDatePrecision) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return precision === "day" ? `${year}${month}${day}` : `${year}${month}`;
};

export const generateBusinessIdentifier = async ({
  prefix,
  date = new Date(),
  precision = "day",
  digits = 6,
  session,
}: GenerateIdentifierOptions): Promise<string> => {
  const normalizedPrefix = prefix.trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9]{1,9}$/.test(normalizedPrefix)) {
    throw new TypeError("Identifier prefix must contain 2-10 uppercase alphanumeric characters.");
  }
  if (!Number.isInteger(digits) || digits < 4 || digits > 12) {
    throw new TypeError("Identifier digits must be an integer between 4 and 12.");
  }

  const period = datePart(date, precision);
  const scope = `${normalizedPrefix}:${period}`;
  const counter = await IdentifierCounterModel.findOneAndUpdate(
    { scope },
    { $inc: { value: 1 }, $setOnInsert: { scope } },
    { new: true, upsert: true, session, setDefaultsOnInsert: true },
  ).lean();

  if (!counter) throw new Error("Could not allocate a business identifier.");
  const sequence = String(counter.value).padStart(digits, "0");
  return `${normalizedPrefix}-${period}-${sequence}`;
};

export { IdentifierCounterModel };

