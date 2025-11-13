import { Router, Response } from "express";
import { Types } from "mongoose";
import Cart from "../../models/Cart";
import DeliverySetting from "../../models/DeliverySetting";
import Order, {
  IDeliverySummary,
  IShippingAddress,
  PaymentStatus,
} from "../../models/Order";
import { authenticateToken } from "../../middleware/auth";
import { calculateCartTotals } from "../utils/cartTotals";
import { invalidateCart, setCachedCart } from "../utils/cache";

const router = Router();

type CheckoutRequestBody = {
  paymentMethod?: string;
  paymentStatus?: PaymentStatus;
  transactionId?: string;
  shippingAddress?: Partial<IShippingAddress> | null;
  deliveryMethodId?: string;
  deliveryMethod?: string;
  notes?: string;
};

function normalizeAddress(
  payload?: Partial<IShippingAddress> | null
): IShippingAddress | undefined {
  if (!payload) return undefined;

  const line1 = payload.line1?.toString().trim();
  const country = payload.country?.toString().trim();

  if (!line1 || !country) {
    throw new Error("Shipping address requires line1 and country.");
  }

  const normalized: IShippingAddress = {
    line1,
    country,
  };

  if (payload.fullName) normalized.fullName = payload.fullName.toString().trim();
  if (payload.phone) normalized.phone = payload.phone.toString().trim();
  if (payload.line2) normalized.line2 = payload.line2.toString().trim();
  if (payload.city) normalized.city = payload.city.toString().trim();
  if (payload.state) normalized.state = payload.state.toString().trim();
  if (payload.postalCode)
    normalized.postalCode = payload.postalCode.toString().trim();

  return normalized;
}

async function resolveDelivery(
  cart: any,
  options: { methodId?: string; method?: string }
): Promise<IDeliverySummary | undefined> {
  const { methodId, method } = options;

  const byId = methodId
    ? await DeliverySetting.findById(methodId).lean()
    : null;
  if (byId) {
    return {
      setting: byId._id as Types.ObjectId,
      method: byId.method,
      baseFee: byId.baseFee,
      estimatedDays: byId.estimatedDays,
      code: byId.code,
    };
  }

  const byMethod = method
    ? await DeliverySetting.findOne({ method, isActive: true }).lean()
    : null;
  if (byMethod) {
    return {
      setting: byMethod._id as Types.ObjectId,
      method: byMethod.method,
      baseFee: byMethod.baseFee,
      estimatedDays: byMethod.estimatedDays,
      code: byMethod.code,
    };
  }

  const populated = cart?.delivery as any;
  if (populated && populated.method) {
    const rawId = populated._id ?? populated.id ?? null;
    const normalizedId =
      rawId instanceof Types.ObjectId
        ? rawId
        : typeof rawId === "string" && Types.ObjectId.isValid(rawId)
        ? new Types.ObjectId(rawId)
        : null;
    return {
      setting: normalizedId,
      method: populated.method,
      baseFee: populated.baseFee,
      estimatedDays: populated.estimatedDays,
      code: populated.code,
    };
  }

  const existingId = cart?.delivery;
  if (existingId && Types.ObjectId.isValid(existingId)) {
    const doc = await DeliverySetting.findById(existingId).lean();
    if (doc) {
      return {
        setting: doc._id as Types.ObjectId,
        method: doc.method,
        baseFee: doc.baseFee,
        estimatedDays: doc.estimatedDays,
        code: doc.code,
      };
    }
  }

  const fallback = await DeliverySetting.findOne({ isActive: true }).lean();
  if (!fallback) return undefined;

  return {
    setting: fallback._id as Types.ObjectId,
    method: fallback.method,
    baseFee: fallback.baseFee,
    estimatedDays: fallback.estimatedDays,
    code: fallback.code,
  };
}

router.post("/checkout", authenticateToken, async (req: any, res: Response) => {
  const body = req.body as CheckoutRequestBody;

  try {
    const cart = await Cart.findOne({ user: req.user.id })
      .populate("items.product")
      .populate("promoCode")
      .populate("delivery");

    if (!cart || cart.items.length === 0) {
      res.status(400).json({ error: "Cart is empty." });
      return;
    }

    const delivery = await resolveDelivery(cart, {
      methodId: body.deliveryMethodId,
      method: body.deliveryMethod,
    });

    if (!delivery) {
      res
        .status(400)
        .json({ error: "No delivery methods are currently available." });
      return;
    }

    const items = cart.items.map((item: any) => {
      const productDoc = item.product as any;
      return {
        rawProduct: productDoc,
        quantity: item.quantity,
      };
    });

    for (const { rawProduct, quantity } of items) {
      if (!rawProduct || rawProduct.isDeleted) {
        res.status(400).json({ error: "One of the products is unavailable." });
        return;
      }
      if (typeof rawProduct.stock === "number" && rawProduct.stock < quantity) {
        res.status(400).json({
          error: `Not enough stock for ${rawProduct.name}.`,
        });
        return;
      }
    }

    const subTotal = cart.items.reduce((acc: number, item: any) => {
      const price = (item.product as any)?.price || 0;
      return acc + price * item.quantity;
    }, 0);

    const discount = cart.discount || 0;
    const deliveryMethod = delivery.method || "standard";

    const { serviceTax, deliveryFee, total } = await calculateCartTotals(
      subTotal,
      discount,
      deliveryMethod
    );

    const shippingAddress = normalizeAddress(body.shippingAddress);

    const order = new Order({
      user: req.user.id,
      items: cart.items.map((item: any) => {
        const productDoc = item.product as any;
        return {
          product: productDoc._id,
          name: productDoc.name,
          slug: productDoc.slug,
          image: Array.isArray(productDoc.images)
            ? productDoc.images[0]
            : undefined,
          price: productDoc.price,
          quantity: item.quantity,
        };
      }),
      subTotal,
      discount,
      deliveryFee,
      serviceTax,
      total,
      status: "pending",
      payment: {
        method: body.paymentMethod?.toString().trim() || undefined,
        status: body.paymentStatus || "pending",
        transactionId: body.transactionId?.toString().trim() || undefined,
      },
      shippingAddress,
      delivery,
      promoCode:
        cart.promoCode && typeof (cart.promoCode as any)._id !== "undefined"
          ? (cart.promoCode as any)._id
          : cart.promoCode || null,
      notes: body.notes?.toString().trim() || undefined,
    });

    await order.save();

    for (const { rawProduct, quantity } of items) {
      if (typeof rawProduct.stock === "number") {
        rawProduct.stock = Math.max(0, rawProduct.stock - quantity);
      }
      if (typeof rawProduct.salesCount === "number") {
        rawProduct.salesCount += quantity;
      } else {
        rawProduct.salesCount = quantity;
      }
      await rawProduct.save();
    }

    cart.items = [];
    cart.subTotal = 0;
    cart.discount = 0;
    cart.serviceTax = 0;
    cart.deliveryFee = 0;
    cart.total = 0;
    cart.promoCode = null as any;
    cart.delivery = (delivery.setting ?? null) as any;
    await cart.save();

    const emptyCartPayload = {
      items: [],
      promoCode: null,
      delivery: cart.delivery,
      summary: {
        subTotal: 0,
        discount: 0,
        deliveryFee: 0,
        serviceTax: 0,
        total: 0,
        promoCode: null,
        promo: null,
      },
    };

    await setCachedCart(req.user.id, emptyCartPayload);
    await invalidateCart(req.user.id);

    const plainOrder = order.toObject({ virtuals: false });
    delete (plainOrder as any).__v;

    res.status(201).json({
      message: "Order placed successfully.",
      order: plainOrder,
    });
  } catch (err: any) {
    console.error(err);
    if (err instanceof Error && err.message.includes("Shipping address")) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: "Failed to complete checkout." });
  }
});

export default router;