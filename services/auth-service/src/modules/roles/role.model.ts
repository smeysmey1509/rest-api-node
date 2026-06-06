import mongoose, { Schema } from "mongoose";

export interface IRole extends Document {
    name: string;
    permission: string[]
}

const roleSchema = new Schema<IRole>({
    name: {type: String, required: true, unique: true},
    permission: [{type: String}]
})

export default mongoose.model<IRole>("Role", roleSchema)