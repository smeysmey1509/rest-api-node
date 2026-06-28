import mongoose from "mongoose";

const SidebarItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    path: { type: String }, // route path if applicable
    icon: { type: String },
    order: { type: Number, default: 0 },
    type: { type: String, enum: ['module', 'service', 'feature'], required: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'SidebarItem', default: null },
}, { timestamps: true });

export default mongoose.model("SidebarItem", SidebarItemSchema);