import mongoose, { Schema, Document } from "mongoose";

export interface CartItem {
  product: mongoose.Types.ObjectId;
  quantity: number;
}

export interface ICart extends Document {
  user: mongoose.Types.ObjectId;
  items: CartItem[];
  subTotal?: number;
  promoCode?: mongoose.Types.ObjectId | null;
  discount?: number;
  serviceTax?: number;
  deliveryFee?: number;
  total?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const CartSchema: Schema = new Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: [
      {
        product: {
          type: mongoose.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: { type: Number, required: true, default: 1 },
      },
    ],
    subTotal: { type: Number, default: 0 },
    promoCode: {
      type: mongoose.Types.ObjectId,
      ref: "PromoCode",
      default: null,
    },
    discount: { type: Number, default: 0 },
    serviceTax: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model<ICart>("Cart", CartSchema);
