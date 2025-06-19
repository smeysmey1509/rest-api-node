import mongoose, { Schema, Document, Model } from "mongoose";
import {IProduct} from "./Product";

export interface IActivity extends Document {
    user: mongoose.Types.ObjectId;
    products: IProduct[];
    action: 'create' | 'update' | 'delete';
    timestamp: Date;
}

const ActivitySchema: Schema<IActivity> = new Schema({
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    products: [{
        _id: mongoose.Schema.Types.ObjectId,
        name: String,
        description: String,
        price: Number,
        stock: Number,
        category: {
            _id: mongoose.Schema.Types.ObjectId,
            name: String,
            description: String
        },
    }],
    action: {
        type: String,
        enum: ["create", "delete", "update"],
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    }
})

const Activity: Model<IActivity> = mongoose.model<IActivity>("Activity", ActivitySchema);
export default Activity;