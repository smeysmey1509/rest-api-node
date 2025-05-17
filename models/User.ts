import mongoose, { Document, Schema } from 'mongoose'

// 1, Define the User interface
export interface IUser extends Document {
    username: string
    email: string
    password: string
    createdAt: Date
    updatedAt: Date
}

// 2, Create the User schema
const userSchema = new Schema<IUser>({
    username:{
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
}, {
    timestamps: true,
})

export const User = mongoose.model<IUser>('User', userSchema)