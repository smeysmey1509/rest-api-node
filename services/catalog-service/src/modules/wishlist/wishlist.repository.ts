import Wishlist from "./wishlist.model";

const populateProducts = {
  path: "items.product",
  populate: [{ path: "brand" }, { path: "category" }, { path: "seller" }],
};

export const wishlistRepository = {
  findByUser(userId: string) {
    return Wishlist.findOne({ user: userId });
  },

  findPopulatedByUser(userId: string) {
    return Wishlist.findOne({ user: userId }).populate(populateProducts);
  },

  createForUser(userId: string) {
    return new Wishlist({ user: userId, items: [] });
  },

  populateProducts(doc: any) {
    return doc.populate(populateProducts);
  },
};
