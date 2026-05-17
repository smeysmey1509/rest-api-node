import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISupplier extends Document {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  contactPerson?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    name: { type: String, required: true, trim: true, index: true },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    address: { type: String, trim: true, default: "" },
    contactPerson: { type: String, trim: true, default: "" },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false }
);

SupplierSchema.index({ name: 1, phone: 1 });
SupplierSchema.index({ email: 1 }, { sparse: true });

const Supplier: Model<ISupplier> = mongoose.models.Supplier || mongoose.model<ISupplier>("Supplier", SupplierSchema);

export default Supplier;
