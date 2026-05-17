"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderRepository = void 0;
const order_model_1 = __importDefault(require("./order.model"));
exports.orderRepository = {
    listByUser(userId) {
        return order_model_1.default.find({ user: userId }).sort({ createdAt: -1 }).lean();
    },
    listAll() {
        return order_model_1.default.find().populate("user", "name email").sort({ createdAt: -1 }).lean();
    },
    findById(id) {
        return order_model_1.default.findById(id);
    },
    update(id, updates) {
        return order_model_1.default.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    },
};
