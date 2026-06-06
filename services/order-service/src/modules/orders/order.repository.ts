import Order from "./order.model";

export const orderRepository = {
  listByUser(userId: string) {
    return Order.find({ user: userId }).sort({ createdAt: -1 }).lean();
  },

  listAll() {
    return Order.find().populate("user", "name email").sort({ createdAt: -1 }).lean();
  },

  findById(id: string) {
    return Order.findById(id);
  },

  update(id: string, updates: Record<string, unknown>) {
    return Order.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
  },
};
