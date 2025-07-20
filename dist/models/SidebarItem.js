"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const SidebarItemSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true },
    path: { type: String }, // route path if applicable
    icon: { type: String },
    order: { type: Number, default: 0 },
    type: { type: String, enum: ['module', 'service', 'feature'], required: true },
    parentId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'SidebarItem', default: null },
}, { timestamps: true });
exports.default = mongoose_1.default.model("SidebarItem", SidebarItemSchema);
