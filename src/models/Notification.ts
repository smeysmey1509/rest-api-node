import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
    userId: mongoose.Types.ObjectId;
    title: string;
    message: string;
    read: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const NotificationSchema: Schema<INotification> = new Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        title: { type: String, required: true },
        message: { type: String, required: true },
        read: { type: Boolean, default: false },
    },
    { timestamps: true }
);

export default mongoose.model<INotification>("Notification", NotificationSchema);
