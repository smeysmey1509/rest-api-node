import { Router, Request, Response } from "express";
import Cart, { ICart } from "../../models/Cart";
import Product from "../../models/Product";
import PromoCode from "../../models/PromoCode";
import PromoUsage from "../../models/PromoUsage";
import { authenticateToken } from "../../middleware/auth";
import { calculateCartTotals } from "../utils/cartTotals";
import multer from "multer";

const upload = multer();

const router = Router();

// Helper function to calculate subtotal
const calculateCartSubtotal = async (userId: string): Promise<number> => {
  const cart = await Cart.findOne({ user: userId }).populate("items.product");
  if (!cart) return 0;

  const subtotal = cart.items.reduce((acc: number, item: any) => {
    const productPrice = item.product?.price || 0;
    return acc + productPrice * item.quantity;
  }, 0);

  return subtotal;
};

// GET /api/v1/cart - Get user's cart
router.get(
  "/cart",
  authenticateToken,
  async (req: any, res: Response): Promise<void> => {
    try {
      // Cast cart to include timestamps
      const cart = await Cart.findOne({ user: req.user.id })
        .populate("items.product")
        .populate("promoCode")
        .lean<ICart & { createdAt: Date; updatedAt: Date }>()
        .exec();

      if (cart) {
        const subtotal = await calculateCartSubtotal(req.user.id);
        const { serviceTax, deliveryFee, total } = calculateCartTotals(
          subtotal,
          cart.discount || 0
        );

        // Update DB fields
        await Cart.findByIdAndUpdate(cart._id, {
          subTotal: subtotal,
          serviceTax,
          deliveryFee,
          total,
        });

        // Send structured response
        res.status(200).json({
          _id: cart._id,
          user: cart.user,
          items: cart.items,
          promoCode: cart.promoCode,
          summary: {
            subTotal: subtotal,
            discount: cart.discount || 0,
            deliveryFee,
            serviceTax,
            total,
          },
          createdAt: cart.createdAt,
          updatedAt: cart.updatedAt,
        });
        return;
      }

      res.status(200).json({ items: [], summary: {} });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch cart." });
    }
  }
);

// POST /api/v1/cart/add - Add product to cart
router.post("/cart/add", authenticateToken, async (req: any, res: Response) => {
  try {
    const { productId, quantity } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({ error: "Product not found." });
      return;
    }

    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );
    if (itemIndex > -1) {
      // Increment existing quantity
      cart.items[itemIndex].quantity += quantity || 1;
    } else {
      cart.items.push({ product: productId, quantity: quantity || 1 });
    }

    await cart.save();
    cart.subTotal = await calculateCartSubtotal(req.user.id);
    await cart.save();

    res.status(200).json(cart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add to cart." });
  }
});

// POST /api/v1/cart/remove - Remove product from cart
router.post(
  "/cart/remove",
  authenticateToken,
  upload.none(),
  async (req: any, res: Response) => {
    try {
      // Now productId will be in req.body.productId (string), parsed from form-data
      const { productId } = req.body;

      const cart = await Cart.findOne({ user: req.user.id });
      if (!cart) {
        res.status(404).json({ error: "Cart not found." });
        return;
      }

      cart.items = cart.items.filter(
        (item) => item.product.toString() !== productId.toString()
      );

      cart.subTotal = await calculateCartSubtotal(req.user.id);
      await cart.save();
      await cart.populate("items.product");

      res.status(200).json(cart);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to remove from cart." });
    }
  }
);

// POST /api/v1/cart/clear - Clear cart
router.post(
  "/cart/clear",
  authenticateToken,
  async (req: any, res: Response) => {
    try {
      const cart = await Cart.findOne({ user: req.user.id });
      if (!cart) {
        res.status(404).json({ error: "Cart not found." });
        return;
      }

      cart.items = [];
      cart.subTotal = 0;
      await cart.save();

      res.status(200).json({ msg: "Cart cleared." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to clear cart." });
    }
  }
);

// PUT /api/v1/cart/update/:productId - Update quantity of product in cart
router.put(
  "/cart/update/:productId",
  authenticateToken,
  async (req: any, res: Response) => {
    try {
      const { productId } = req.params;
      const { quantity } = req.body;

      if (quantity < 1) {
        res.status(400).json({ error: "Quantity must be at least 1." });
        return;
      }

      const cart = await Cart.findOne({ user: req.user.id });
      if (!cart) {
        res.status(404).json({ error: "Cart not found." });
        return;
      }

      const item = cart.items.find((i) => i.product.toString() === productId);
      if (!item) {
        res.status(404).json({ error: "Product not found in cart." });
        return;
      }

      item.quantity = quantity;
      await cart.save();

      cart.subTotal = await calculateCartSubtotal(req.user.id);
      await cart.save();

      await cart.populate("items.product");
      res.status(200).json(cart);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update cart quantity." });
    }
  }
);

router.post(
  "/cart/apply-promo",
  authenticateToken,
  async (req: any, res: Response) => {
    try {
      const { code } = req.body;
      if (!code) {
        res.status(400).json({ error: "Promo code is required." });
        return;
      }

      const promo = await PromoCode.findOne({
        code: code.toUpperCase(),
        isActive: true,
      });
      if (!promo) {
        res.status(404).json({ error: "Promo code not found or inactive." });
        return;
      }

      if (promo.expiresAt < new Date()) {
        res.status(400).json({ error: "Promo code has expired." });
        return;
      }

      let usage = await PromoUsage.findOne({
        user: req.user.id,
        promoCode: promo._id,
      });

      if (usage) {
        if (usage.usageCount >= promo.maxUsesPerUser) {
          res.status(400).json({
            error: `Promo code usage limit reached (${promo.maxUsesPerUser} times).`,
          });
          return;
        }
        usage.usageCount += 1;
      } else {
        usage = new PromoUsage({
          user: req.user.id,
          promoCode: promo._id,
          usageCount: 1,
        });
      }

      await usage.save();

      const cart = await Cart.findOne({ user: req.user.id }).populate(
        "items.product"
      );
      if (!cart) {
        res.status(404).json({ error: "Cart not found." });
        return;
      }

      const subtotal = await calculateCartSubtotal(req.user.id);

      let discountAmount = 0;
      if (promo.discountType === "percentage") {
        discountAmount = subtotal * (promo.discountValue / 100);
      } else {
        discountAmount = promo.discountValue;
      }

      // 🔹 Apply service tax & delivery fee
      const { serviceTax, deliveryFee, total } = calculateCartTotals(
        subtotal,
        discountAmount
      );

      cart.promoCode = promo._id;
      cart.discount = discountAmount;
      cart.subTotal = subtotal;
      cart.serviceTax = serviceTax;
      cart.deliveryFee = deliveryFee;
      cart.total = total;

      await cart.save();
      await cart.populate("promoCode");

      res.status(200).json({
        success: true,
        message: "Promo code applied successfully.",
        promo: {
          code: promo.code,
          type: promo.discountType,
          value: promo.discountValue,
          amount: discountAmount,
          usageCount: usage.usageCount,
          maxUsesPerUser: promo.maxUsesPerUser,
          expiresAt: promo.expiresAt,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to apply promo code." });
    }
  }
);

// Remove promo code from cart
router.post(
  "/cart/remove-promocode",
  authenticateToken,
  async (req: any, res: Response): Promise<void> => {
    try {
      // Find user's cart
      const cart = await Cart.findOne({ user: req.user.id }).populate(
        "items.product"
      );

      if (!cart) {
        res.status(404).json({ error: "Cart not found." });
        return;
      }

      // Reset promo fields
      cart.promoCode = null;
      cart.discount = 0;

      // Recalculate totals
      const subtotal = await calculateCartSubtotal(req.user.id);
      const { serviceTax, deliveryFee, total } = calculateCartTotals(
        subtotal,
        0
      );

      cart.subTotal = subtotal;
      cart.serviceTax = serviceTax;
      cart.deliveryFee = deliveryFee;
      cart.total = total;

      await cart.save();

      // Return updated cart
      res.status(200).json({
        _id: cart._id,
        user: cart.user,
        items: cart.items,
        promoCode: null,
        summary: {
          subTotal: subtotal,
          discount: 0,
          deliveryFee: cart.deliveryFee,
          serviceTax: cart.serviceTax,
          total: cart.total,
        },
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to remove promo code." });
    }
  }
);

export default router;
