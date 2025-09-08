import mongoose, {Document, Schema} from "mongoose";

export interface ICategory extends Document{
    categoryId?: string;
    categoryName?: string;
    productCount?: number;
    totalStock?: number;
    avgPrice?: number;
    totalSales?: number;
    description?: string;
}

const CategorySchema = new Schema<ICategory>({
    categoryId: {type: String, required: true, unique: true, trim: true,},
    categoryName: {type: String, required: true, unique: true, trim: true,},
    productCount: {type: Number, default: 0},
    totalStock: {type: Number, default: 0},
    avgPrice: {type: Number, default: 0},
    totalSales: {type: Number, default: 0},
    description: {type: String, default: ''},
})

export default  mongoose.model<ICategory>("Category", CategorySchema);