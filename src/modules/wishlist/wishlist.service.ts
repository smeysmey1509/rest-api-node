import Product from "../products/product.model";
import { AppError } from "../../common/utils/appError";
import { wishlistRepository } from "./wishlist.repository";
import { cartService } from "../cart/cart.service";

export const wishlistService = {
  async get(userId: string, query: Record<string, unknown>) {
    const page = Math.max(parseInt(String(query.page || "1"), 10), 1);
    const limit = Math.max(parseInt(String(query.limit || "10"), 10), 1);
    const skip = (page - 1) * limit;
    const wishlist = await wishlistRepository.findPopulatedByUser(userId).lean();

    if (!wishlist) {
      return { items: [], totalItems: 0, totalPages: 0, currentPage: page };
    }

    const validItems = wishlist.items.filter((item: any) => item.product !== null);
    return {
      items: validItems.slice(skip, skip + limit),
      totalItems: validItems.length,
      totalPages: Math.ceil(validItems.length / limit),
      currentPage: page,
      hasNextPage: skip + limit < validItems.length,
      hasPrevPage: page > 1,
    };
  },

  async add(userId: string, productId: string) {
    if (!productId) throw new AppError("Product ID is required.", 400);
    const product = await Product.findById(productId);
    if (!product) throw new AppError("Product not found.", 404);

    let wishlist = await wishlistRepository.findByUser(userId);
    if (!wishlist) wishlist = wishlistRepository.createForUser(userId);

    const alreadySaved = wishlist.items.some((item) => String(item.product) === String(productId));
    if (alreadySaved) {
      throw new AppError("Product already exists in wishlist.", 409, "DUPLICATE_WISHLIST_ITEM");
    }

    wishlist.items.push({ product: productId as any });
    await wishlist.save();
    await wishlistRepository.populateProducts(wishlist);
    return { message: "Product added to wishlist successfully.", wishlist: wishlist.toObject() };
  },

  async remove(userId: string, productId: string) {
    const wishlist = await wishlistRepository.findByUser(userId);
    if (!wishlist) throw new AppError("Wishlist not found.", 404);
    const hadProduct = wishlist.items.some((item) => String(item.product) === String(productId));
    if (!hadProduct) throw new AppError("Product not found in wishlist.", 404);
    wishlist.items = wishlist.items.filter((item) => String(item.product) !== String(productId));
    await wishlist.save();
    await wishlistRepository.populateProducts(wishlist);
    return { message: "Product removed from wishlist.", wishlist: wishlist.toObject() };
  },

  async moveToCart(userId: string, productId: string, quantity = 1) {
    const removed = await this.remove(userId, productId);
    const cart = await cartService.add(userId, productId, quantity);
    return { message: "Moved product to cart.", wishlist: removed.wishlist, cart };
  },
};
