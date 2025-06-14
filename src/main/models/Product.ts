import mongoose, { Document, Schema, Model } from "mongoose";

export interface IProduct extends Document {
  name: string;
  description?: string;
  price: number;
  stock: number;
  category: mongoose.Types.ObjectId;
  seller: mongoose.Types.ObjectId
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema<IProduct> = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
      category: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Category"
      },
      seller: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
      },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

const Product: Model<IProduct> = mongoose.model<IProduct>("Product", ProductSchema);
export default Product
