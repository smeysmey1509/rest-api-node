import Cart from "./cart.model";

export const cartRepository = {
  findByUser(userId: string) {
    return Cart.findOne({ user: userId });
  },

  findPopulatedByUser(userId: string) {
    return Cart.findOne({ user: userId })
      .populate("items.product")
      .populate("promoCode")
      .populate("delivery");
  },

  createForUser(userId: string) {
    return new Cart({ user: userId, items: [] });
  },
};
