// services/reviews.ts
import Review from "../../models/Review";
import Product from "../../models/Product";
import mongoose from "mongoose";

// Create or update a review
export async function upsertReview({
  userId, productId, rating, title, comment, orderItemId
}: {
  userId: string; productId: string; rating: number; title?: string; comment?: string; orderItemId?: string;
}) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const existing = await Review.findOne({ user: userId, product: productId }).session(session);

    if (!existing) {
      await Review.create([{
        user: userId,
        product: productId,
        orderItem: orderItemId,
        isVerifiedPurchase: !!orderItemId, // or check order status
        rating, title, comment,
      }], { session });

      await Product.updateOne(
        { _id: productId },
        { $inc: { ratingCount: 1, ratingSum: rating } },
        { session }
      );

    } else {
      // adjust delta
      const delta = rating - existing.rating;
      existing.set({ rating, title, comment });
      await existing.save({ session });

      if (delta !== 0) {
        await Product.updateOne(
          { _id: productId },
          { $inc: { ratingSum: delta } },
          { session }
        );
      }
    }

    // recompute avg from sum/count in one query
    await Product.updateOne(
      { _id: productId },
      [{ $set: { ratingAvg: { $cond: [{ $gt: ["$ratingCount", 0] }, { $divide: ["$ratingSum", "$ratingCount"] }, 0] } } }],
      { session }
    );

    await session.commitTransaction();
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
}

// Delete review
export async function deleteReview({ userId, productId }: { userId: string; productId: string; }) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const rev = await Review.findOneAndDelete({ user: userId, product: productId }, { session });
    if (rev) {
      await Product.updateOne(
        { _id: productId },
        { $inc: { ratingCount: -1, ratingSum: -rev.rating } },
        { session }
      );
      await Product.updateOne(
        { _id: productId },
        [{ $set: { ratingAvg: { $cond: [{ $gt: ["$ratingCount", 0] }, { $divide: ["$ratingSum", "$ratingCount"] }, 0] } } }],
        { session }
      );
    }
    await session.commitTransaction();
  } catch (e) {
    await session.abortTransaction();
    throw e;
  } finally {
    session.endSession();
  }
}
