import mongoose, {Document, Schema} from "mongoose";

export interface ICategory extends Document{
    name: string;
    description?: string;
}

const CategorySchema = new Schema<ICategory>({
    name: {type: String, required: true, unique: true, trim: true,},
    description: {type: String, default: ''},
})

export default  mongoose.model<ICategory>("Category", CategorySchema);