import { Router, Response } from "express";
import { authenticateToken } from "../../middleware/auth";
import Wishlist from "../../models/Wishlist";
import Product from "../../models/Product";
import Cart from "../../models/Cart";
import DeliverySetting from "../../models/DeliverySetting";
import { calculateCartTotals } from "../utils/cartTotals";
import { setCachedCart } from "../utils/cache";

const router = Router();

const buildCartSnapshot = async (cartDoc: any) => {
  await cartDoc.populate("items.product");
  const deliveryDoc =
    cartDoc.delivery ||
    (await DeliverySetting.findOne({ isActive: true }).lean()) ||
    { _id: null, method: "standard", fee: 0, taxRate: 0 };

  const subTotal = cartDoc.items.reduce((acc: number, item: any) => {
    const price = (item.product as any)?.price || 0;
    return acc + price * item.quantity;
  }, 0);

  const method = String(deliveryDoc.method || "standard").toLowerCase();
  const { serviceTax, deliveryFee, total } = await calculateCartTotals(
    subTotal,
    cartDoc.discount || 0,
    method
  );

  cartDoc.subTotal = subTotal;
  cartDoc.serviceTax = serviceTax;
  cartDoc.deliveryFee = deliveryFee;
  cartDoc.total = total;

  await cartDoc.save();

  const snapshot = {
    _id: cartDoc._id,
    user: cartDoc.user,
    items: cartDoc.items,
    promoCode: cartDoc.promoCode,
    delivery:
      typeof (deliveryDoc as any).toObject === "function"
        ? (deliveryDoc as any).toObject()
        : deliveryDoc,
    summary: {
      subTotal,
      discount: cartDoc.discount || 0,
      deliveryFee,
      serviceTax,
      total,
    },
    createdAt: cartDoc.createdAt,
    updatedAt: cartDoc.updatedAt,
  };

  await setCachedCart(String(cartDoc.user), snapshot);

  return snapshot;
};

router.get("/wishlist", authenticateToken, async (req: any, res: Response) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user.id })
      .populate({
        path: "items.product",
        select: "name price images thumbnail slug discount",
      })
      .lean();

    if (!wishlist) {
      res.status(200).json({ items: [] });
      return;
    }

    res.status(200).json(wishlist);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch wishlist." });
  }
});

router.post("/wishlist/add", authenticateToken, async (req: any, res: Response) => {
  try {
    const { productId, note } = req.body;
    if (!productId) {
      res.status(400).json({ error: "Product ID is required." });
      return;
    }

    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({ error: "Product not found." });
      return;
    }

    let wishlist = await Wishlist.findOne({ user: req.user.id });
    if (!wishlist) {
      wishlist = new Wishlist({ user: req.user.id, items: [] });
    }

    const alreadySaved = wishlist.items.some(
      (item) => String(item.product) === String(productId)
    );
    if (alreadySaved) {
      await wishlist.populate({
        path: "items.product",
        select: "name price images thumbnail slug discount",
      });
      res.status(200).json({
        message: "Product already in wishlist.",
        wishlist: wishlist.toObject(),
      });
      return;
    }

    wishlist.items.push({ product: productId, note });
    await wishlist.save();
    await wishlist.populate({
      path: "items.product",
      select: "name price images thumbnail slug discount",
    });

    res.status(201).json({
      message: "Product saved for later.",
      wishlist: wishlist.toObject(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add to wishlist." });
  }
});

router.delete(
  "/wishlist/:productId",
  authenticateToken,
  async (req: any, res: Response) => {
    try {
      const { productId } = req.params;
      const wishlist = await Wishlist.findOne({ user: req.user.id });
      if (!wishlist) {
        res.status(404).json({ error: "Wishlist not found." });
        return;
      }

      const hadProduct = wishlist.items.some(
        (item) => String(item.product) === String(productId)
      );
      if (!hadProduct) {
        res.status(404).json({ error: "Product not found in wishlist." });
        return;
      }

      wishlist.items = wishlist.items.filter(
        (item) => String(item.product) !== String(productId)
      );

      await wishlist.save();
      await wishlist.populate({
        path: "items.product",
        select: "name price images thumbnail slug discount",
      });

      res.status(200).json({
        message: "Product removed from wishlist.",
        wishlist: wishlist.toObject(),
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to remove product." });
    }
  }
);

router.post(
  "/wishlist/move-to-cart",
  authenticateToken,
  async (req: any, res: Response) => {
    try {
      const { productId, quantity } = req.body;
      if (!productId) {
        res.status(400).json({ error: "Product ID is required." });
        return;
      }

      const product = await Product.findById(productId);
      if (!product) {
        res.status(404).json({ error: "Product not found." });
        return;
      }

      const wishlist = await Wishlist.findOne({ user: req.user.id });
      if (!wishlist) {
        res.status(404).json({ error: "Wishlist not found." });
        return;
      }

      const hadProduct = wishlist.items.some(
        (item) => String(item.product) === String(productId)
      );
      if (!hadProduct) {
        res.status(404).json({ error: "Product not found in wishlist." });
        return;
      }

      wishlist.items = wishlist.items.filter(
        (item) => String(item.product) !== String(productId)
      );
      await wishlist.save();
      await wishlist.populate({
        path: "items.product",
        select: "name price images thumbnail slug discount",
      });

      let cart = await Cart.findOne({ user: req.user.id }).populate("delivery");
      if (!cart) {
        cart = new Cart({ user: req.user.id, items: [] });
      }

      const existingItem = cart.items.find(
        (item) => String(item.product) === String(productId)
      );

      const desiredQuantity = quantity ? Number(quantity) : 1;
      const safeQuantity = Number.isFinite(desiredQuantity)
        ? Math.max(1, desiredQuantity)
        : 1;

      if (existingItem) {
        existingItem.quantity += safeQuantity;
      } else {
        cart.items.push({
          product: productId,
          quantity: safeQuantity,
        });
      }

      const cartSnapshot = await buildCartSnapshot(cart);

      res.status(200).json({
        message: "Moved product to cart.",
        wishlist: wishlist.toObject(),
        cart: cartSnapshot,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to move product to cart." });
    }
  }
);

export default router;