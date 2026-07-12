import mongoose, { InferSchemaType, Model } from "mongoose";

const AddressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User", immutable: true },
    recipient: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    province: { type: String, required: true, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, required: true, uppercase: true, trim: true },
    isDefault: { type: Boolean, required: true, default: false },
  },
  { timestamps: true, collection: "addresses" },
);
AddressSchema.index({ userId: 1, createdAt: -1 });
AddressSchema.index(
  { userId: 1, isDefault: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } },
);

export type Address = InferSchemaType<typeof AddressSchema>;
export const AddressModel = (mongoose.models.Address as Model<Address>) || mongoose.model<Address>("Address", AddressSchema);

