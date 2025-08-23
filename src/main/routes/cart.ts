import { Router, Request, Response } from "express";
import Cart, { ICart } from "../../models/Cart";
import Product from "../../models/Product";
import PromoCode from "../../models/PromoCode";
import PromoUsage from "../../models/PromoUsage";
import DeliverySetting from "../../models/DeliverySetting";
import { authenticateToken } from "../../middleware/auth";
import { calculateCartTotals } from "../utils/cartTotals";
import multer from "multer";
import { getCachedCart, setCachedCart, invalidateCart } from "../utils/cache";

const upload = multer();
const router = Router();

// helper: compute subtotal from an already populated cart
const subtotalFromCart = (cart: Pick<ICart, "items">): number => {
  return cart.items.reduce((acc: number, item: any) => {
    const price = (item.product as any)?.price || 0;
    return acc + price * item.quantity;
  }, 0);
};

// helper: chosen delivery method (lowercase), defaulting to active isActive=true or "standard"
async function resolveDeliveryMethod(cart: any): Promise<string> {
  // if cart has populated delivery with a method, prefer that
  const chosen = cart?.delivery as any;
  if (chosen?.method) return String(chosen.method).toLowerCase();

  // otherwise use the active default
  const active = await DeliverySetting.findOne({ isActive: true }).lean();
  return String(active?.method || "standard").toLowerCase();
}

// GET /api/v1/cart - Get user's cart (now includes delivery + correct totals)
router.get(
  "/cart",
  authenticateToken,
  async (req: any, res: Response): Promise<void> => {
    try {
      // A) Cache fast-path
      const cached = await getCachedCart(req.user.id);
      if (cached) {
        // helpful debug:
        // console.log("[/cart] cache HIT", req.user.id);
        res.status(200).json(cached);
        return;
      }
      // console.log("[/cart] cache MISS", req.user.id);

      // B) Load cart lean (populated docs are also plain because of lean())
      const cart = await Cart.findOne({ user: req.user.id })
        .populate("items.product")
        .populate("promoCode")
        .populate("delivery")
        .lean<ICart & { createdAt: Date; updatedAt: Date }>()
        .exec();

      if (!cart) {
        const empty = {
          items: [],
          promoCode: null,
          delivery: null,
          summary: {
            subTotal: 0,
            discount: 0,
            deliveryFee: 0,
            serviceTax: 0,
            total: 0,
          },
        };
        await setCachedCart(req.user.id, empty);
        res.status(200).json(empty);
        return;
      }

      // C) Prefer cart.delivery; else safe default (no 404)
      let deliveryDoc: any =
        cart.delivery ||
        (await DeliverySetting.findOne({ isActive: true }).lean());

      if (!deliveryDoc) {
        // safe default to keep GET working even if DB is empty
        deliveryDoc = { _id: null, method: "standard", fee: 0, taxRate: 0 };
      }

      // D) Totals computed with the SAME delivery we return
      const subTotal = subtotalFromCart(cart);
      const method = String(deliveryDoc.method || "standard").toLowerCase();
      const { serviceTax, deliveryFee, total } = await calculateCartTotals(
        subTotal,
        cart.discount || 0,
        method
      );

      // best-effort DB sync (don’t block the response if it fails)
      void Cart.findByIdAndUpdate(cart._id, {
        subTotal,
        serviceTax,
        deliveryFee,
        total,
      });

      const response = {
        _id: cart._id,
        user: cart.user,
        items: cart.items,
        promoCode: cart.promoCode,
        delivery: deliveryDoc,
        summary: {
          subTotal,
          discount: cart.discount || 0,
          deliveryFee,
          serviceTax,
          total,
        },
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt,
      };

      // E) Write-through cache so next GET is instant
      await setCachedCart(req.user.id, response);
      res.status(200).json(response);
      return;
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch cart." });
      return;
    }
  }
);

// POST /api/v1/cart/add - Add product to cart (recompute totals with chosen delivery)
router.post("/cart/add", authenticateToken, async (req: any, res: Response) => {
  try {
    const { productId, quantity } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({ error: "Product not found." });
      return;
    }

    let cart = await Cart.findOne({ user: req.user.id }).populate("delivery");
    if (!cart) cart = new Cart({ user: req.user.id, items: [] });

    const idx = cart.items.findIndex(
      (it) => it.product.toString() === productId
    );
    if (idx > -1) cart.items[idx].quantity += quantity || 1;
    else cart.items.push({ product: productId, quantity: quantity || 1 });

    // recompute totals
    await cart.populate("items.product");
    const subtotal = subtotalFromCart(cart);
    const method = await resolveDeliveryMethod(cart);
    const { serviceTax, deliveryFee, total } = await calculateCartTotals(
      subtotal,
      cart.discount || 0,
      method
    );

    cart.subTotal = subtotal;
    cart.serviceTax = serviceTax;
    cart.deliveryFee = deliveryFee;
    cart.total = total;

    await cart.save();
    res.status(200).json(cart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add to cart." });
  }
});

// POST /api/v1/cart/remove
router.post(
  "/cart/remove",
  authenticateToken,
  upload.none(),
  async (req: any, res: Response) => {
    try {
      const { productId } = req.body;
      const cart = await Cart.findOne({ user: req.user.id }).populate(
        "delivery"
      );
      if (!cart) {
        res.status(404).json({ error: "Cart not found." });
        return;
      }

      cart.items = cart.items.filter(
        (it) => it.product.toString() !== String(productId)
      );

      await cart.populate("items.product");
      const subtotal = subtotalFromCart(cart);
      const method = await resolveDeliveryMethod(cart);
      const { serviceTax, deliveryFee, total } = await calculateCartTotals(
        subtotal,
        cart.discount || 0,
        method
      );

      cart.subTotal = subtotal;
      cart.serviceTax = serviceTax;
      cart.deliveryFee = deliveryFee;
      cart.total = total;

      await cart.save();
      await invalidateCart(req.user.id);
      res.status(200).json(cart);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to remove from cart." });
    }
  }
);

// POST /api/v1/cart/clear
router.post(
  "/cart/clear",
  authenticateToken,
  async (req: any, res: Response) => {
    try {
      const cart = await Cart.findOne({ user: req.user.id }).populate(
        "delivery"
      );
      if (!cart) {
        res.status(404).json({ error: "Cart not found." });
        return;
      }

      cart.items = [];
      const subtotal = 0;
      const method = await resolveDeliveryMethod(cart);
      const { serviceTax, deliveryFee, total } = await calculateCartTotals(
        subtotal,
        0,
        method
      );

      cart.subTotal = subtotal;
      cart.discount = 0;
      cart.promoCode = null as any;
      cart.serviceTax = serviceTax;
      cart.deliveryFee = deliveryFee;
      cart.total = total;

      await cart.save();
      await invalidateCart(req.user.id);
      res.status(200).json({ msg: "Cart cleared." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to clear cart." });
    }
  }
);

// PUT /api/v1/cart/update/:productId
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

      const cart = await Cart.findOne({ user: req.user.id }).populate(
        "delivery"
      );
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

      await cart.populate("items.product");
      const subtotal = subtotalFromCart(cart);
      const method = await resolveDeliveryMethod(cart);
      const { serviceTax, deliveryFee, total } = await calculateCartTotals(
        subtotal,
        cart.discount || 0,
        method
      );

      cart.subTotal = subtotal;
      cart.serviceTax = serviceTax;
      cart.deliveryFee = deliveryFee;
      cart.total = total;

      await cart.save();
      await invalidateCart(req.user.id);
      res.status(200).json(cart);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to update cart quantity." });
    }
  }
);

// POST /api/v1/cart/apply-promo
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

      const cart = await Cart.findOne({ user: req.user.id })
        .populate("items.product")
        .populate("delivery");
      if (!cart) {
        res.status(404).json({ error: "Cart not found." });
        return;
      }

      const subtotal = subtotalFromCart(cart);
      const discountAmount =
        promo.discountType === "percentage"
          ? subtotal * (promo.discountValue / 100)
          : promo.discountValue;

      const method = await resolveDeliveryMethod(cart);
      const { serviceTax, deliveryFee, total } = await calculateCartTotals(
        subtotal,
        discountAmount,
        method
      );

      cart.promoCode = promo._id as any;
      cart.discount = discountAmount;
      cart.subTotal = subtotal;
      cart.serviceTax = serviceTax;
      cart.deliveryFee = deliveryFee;
      cart.total = total;

      await cart.save();
      await cart.populate("promoCode");
      await invalidateCart(req.user.id);

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

// POST /api/v1/cart/remove-promocode
router.post(
  "/cart/remove-promocode",
  authenticateToken,
  async (req: any, res: Response) => {
    try {
      const cart = await Cart.findOne({ user: req.user.id })
        .populate("items.product")
        .populate("delivery");
      if (!cart) {
        res.status(404).json({ error: "Cart not found." });
        return;
      }

      cart.promoCode = null as any;
      cart.discount = 0;

      const subtotal = subtotalFromCart(cart);
      const method = await resolveDeliveryMethod(cart);
      const { serviceTax, deliveryFee, total } = await calculateCartTotals(
        subtotal,
        0,
        method
      );

      cart.subTotal = subtotal;
      cart.serviceTax = serviceTax;
      cart.deliveryFee = deliveryFee;
      cart.total = total;

      await cart.save();
      await invalidateCart(req.user.id);

      res.status(200).json({
        _id: cart._id,
        user: cart.user,
        items: cart.items,
        promoCode: null,
        summary: {
          subTotal: subtotal,
          discount: 0,
          deliveryFee,
          serviceTax,
          total,
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

// POST /api/v1/cart/select-delivery
router.post(
  "/cart/select-delivery",
  authenticateToken,
  async (req: any, res: Response) => {
    try {
      const { method } = req.body; // e.g. "standard", "express"
      if (!method) {
        res.status(400).json({ error: "Delivery method is required." });
        return;
      }

      const delivery = await DeliverySetting.findOne({
        method,
        isActive: true,
      });
      if (!delivery) {
        res.status(404).json({ error: "Delivery method not found." });
        return;
      }

      const cart = await Cart.findOne({ user: req.user.id }).populate(
        "items.product"
      );
      if (!cart) {
        res.status(404).json({ error: "Cart not found." });
        return;
      }

      cart.delivery = delivery._id as any;

      await cart.save();
      await cart.populate("delivery");
      await invalidateCart(req.user.id);
      res.status(200).json({
        _id: cart._id,
        user: cart.user,
        delivery: cart.delivery,
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to select delivery method." });
    }
  }
);

export default router;
