import mongoose, { Schema, Document } from "mongoose";

export interface WishlistItem {
  product: mongoose.Types.ObjectId;
  addedAt?: Date;
  note?: string;
}

export interface IWishlist extends Document {
  user: mongoose.Types.ObjectId;
  items: WishlistItem[];
  createdAt?: Date;
  updatedAt?: Date;
}

const WishlistSchema: Schema = new Schema(
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
        addedAt: {
          type: Date,
          default: Date.now,
        },
        note: {
          type: String,
          trim: true,
          maxlength: 280,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

WishlistSchema.index({ user: 1 });
WishlistSchema.index({ user: 1, "items.product": 1 }, { unique: true });

export default mongoose.model<IWishlist>("Wishlist", WishlistSchema);