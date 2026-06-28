import Review from "./review.model";

export const reviewRepository = {
  listApprovedByProduct(productId: string) {
    return Review.find({ product: productId, status: "APPROVED" })
      .populate("user", "name")
      .sort({ createdAt: -1 })
      .lean();
  },

  create(payload: Record<string, unknown>) {
    return Review.create(payload);
  },

  findById(id: string) {
    return Review.findById(id);
  },

  delete(id: string) {
    return Review.findByIdAndDelete(id);
  },
};
