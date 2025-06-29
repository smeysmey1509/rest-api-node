import mongoose, { Document, Schema, Model } from "mongoose";

export interface IProduct extends Document {
    name: string;
    description?: string;
    price: number;
    stock: number;
    category: mongoose.Types.ObjectId;
    seller: mongoose.Types.ObjectId;
    status: "Published" | "Unpublished";
    tag: string[];
    image?: string[];
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
            ref: "Category",
        },
        seller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        status: {
            type: String,
            enum: ["Published", "Unpublished"],
            default: "Published",
        },
        tag: {
            type: [String],
            default: []
        },
        image:{
            type: [String],
            default: [],
        }
    },
    {
        timestamps: true,
    }
);

ProductSchema.index({ name: "text", tag: "text" });

const Product: Model<IProduct> = mongoose.model<IProduct>("Product", ProductSchema);
export default Product;
