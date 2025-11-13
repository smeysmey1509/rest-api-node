import { Router, Response } from "express";
import { Types } from "mongoose";
import Cart from "../../models/Cart";
import DeliverySetting from "../../models/DeliverySetting";
import Order, {
  IContactDetails,
  IPaymentSummary,
  IDeliverySummary,
  IShippingAddress,
  PaymentStatus,
} from "../../models/Order";
import { authenticateToken } from "../../middleware/auth";
import { calculateCartTotals } from "../utils/cartTotals";
import { invalidateCart, setCachedCart } from "../utils/cache";

const router = Router();

type ContactPayload = Partial<IContactDetails> & {
  firstName?: string;
  lastName?: string;
  name?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactNumber?: string;
  mobile?: string;
};

type PaymentPayload = Partial<IPaymentSummary> & {
  type?: string;
  provider?: string;
  name?: string;
  reference?: string;
  id?: string;
};

type DeliverySelectionPayload = {
  id?: string;
  _id?: string;
  setting?: string;
  method?: string;
};

type CheckoutRequestBody = {
  paymentMethod?: string;
  paymentStatus?: PaymentStatus | string;
  transactionId?: string;
  payment?: PaymentPayload | null;
  shippingAddress?: Partial<IShippingAddress> | null;
  address?: Partial<IShippingAddress> | null;
  contact?: ContactPayload | null;
  personalDetails?: ContactPayload | null;
  customer?: ContactPayload | null;
  deliveryMethodId?: string;
  deliveryMethod?: string;
  deliverySelection?: DeliverySelectionPayload | null;
  delivery?: DeliverySelectionPayload | null;
  notes?: string;
};

const PAYMENT_STATUSES: PaymentStatus[] = [
  "pending",
  "authorized",
  "paid",
  "failed",
  "refunded",
];

function toTrimmedString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const str = String(value).trim();
  return str.length > 0 ? str : undefined;
}

function coalesceString(
  source: Record<string, unknown> | null | undefined,
  keys: string[]
): string | undefined {
  if (!source) return undefined;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const value = toTrimmedString((source as any)[key]);
      if (value) return value;
    }
  }
  return undefined;
}

function normalizeContact(
  payload?: ContactPayload | null
): IContactDetails | undefined {
  if (!payload) return undefined;

  const firstName = toTrimmedString(payload.firstName);
  const lastName = toTrimmedString(payload.lastName);

  let fullName =
    toTrimmedString(payload.fullName) || toTrimmedString(payload.name);

  if (!fullName && (firstName || lastName)) {
    fullName = [firstName, lastName].filter(Boolean).join(" ");
  }

  const email =
    toTrimmedString(payload.email) || toTrimmedString(payload.contactEmail);

  const phone =
    toTrimmedString(payload.phone) ||
    toTrimmedString(payload.contactPhone) ||
    toTrimmedString(payload.contactNumber) ||
    toTrimmedString(payload.mobile);

  if (!fullName && !email && !phone) {
    return undefined;
  }

  const contact: IContactDetails = {};
  if (fullName) contact.fullName = fullName;
  if (email) contact.email = email;
  if (phone) contact.phone = phone;

  return contact;
}

function normalizeAddress(
  payload?: Partial<IShippingAddress> | null,
  fallbackContact?: IContactDetails
): IShippingAddress | undefined {
  if (!payload) return undefined;

  const record = payload as Record<string, unknown>;

  const line1 = coalesceString(record, [
    "line1",
    "address1",
    "addressLine1",
    "street",
    "street1",
    "streetAddress",
    "address",
  ]);

  const country = coalesceString(record, [
    "country",
    "countryCode",
    "countryName",
  ]);

  if (!line1 || !country) {
    throw new Error("Shipping address requires line1 and country.");
  }

  const normalized: IShippingAddress = {
    line1,
    country,
  };

  const fullName =
    coalesceString(record, ["fullName", "name", "recipientName"]) ||
    fallbackContact?.fullName;
  if (fullName) normalized.fullName = fullName;

  const phone =
    coalesceString(record, [
      "phone",
      "contactNumber",
      "contactPhone",
      "mobile",
    ]) || fallbackContact?.phone;
  if (phone) normalized.phone = phone;

  const line2 = coalesceString(record, [
    "line2",
    "address2",
    "addressLine2",
    "street2",
    "apartment",
    "suite",
  ]);
  if (line2) normalized.line2 = line2;

  const city = coalesceString(record, ["city", "town"]);
  if (city) normalized.city = city;

  const state = coalesceString(record, ["state", "province", "region"]);
  if (state) normalized.state = state;

  const postalCode = coalesceString(record, [
    "postalCode",
    "zip",
    "zipCode",
    "postcode",
  ]);
  if (postalCode) normalized.postalCode = postalCode;

  return normalized;
}

function normalizePayment(body: CheckoutRequestBody): IPaymentSummary {
  const nested = body.payment || undefined;

  const method =
    toTrimmedString(body.paymentMethod) ||
    (nested &&
      (coalesceString(nested as Record<string, unknown>, [
        "method",
        "type",
        "provider",
        "name",
      ]) as string | undefined));

  const transactionId =
    toTrimmedString(body.transactionId) ||
    (nested &&
      (coalesceString(nested as Record<string, unknown>, [
        "transactionId",
        "reference",
        "id",
      ]) as string | undefined));

  const statusCandidate =
    body.paymentStatus ??
    (nested && (nested as Record<string, unknown>).status);

  let status = PAYMENT_STATUSES[0];
  if (statusCandidate) {
    const normalized = toTrimmedString(statusCandidate);
    if (
      normalized &&
      PAYMENT_STATUSES.includes(normalized.toLowerCase() as PaymentStatus)
    ) {
      status = normalized.toLowerCase() as PaymentStatus;
    }
  }

  const payment: IPaymentSummary = { status };
  if (method) payment.method = method;
  if (transactionId) payment.transactionId = transactionId;

  return payment;
}

function buildPromoSummary(promo: any, discountAmount: number) {
  if (!promo) return null;

  const promoDoc =
    typeof promo?.toObject === "function" ? promo.toObject() : promo;

  const codeCandidate =
    typeof promoDoc === "string"
      ? promoDoc
      : promoDoc?.code ?? promoDoc?.Code ?? null;

  const code = toTrimmedString(codeCandidate);
  if (!code) return null;

  const summary: Record<string, any> = { code };

  if (promoDoc?.discountType) summary.type = promoDoc.discountType;
  if (typeof promoDoc?.discountValue === "number") {
    summary.value = promoDoc.discountValue;
  }
  if (typeof promoDoc?.maxUsesPerUser === "number") {
    summary.maxUsesPerUser = promoDoc.maxUsesPerUser;
  }
  if (promoDoc?.expiresAt) summary.expiresAt = promoDoc.expiresAt;

  const normalizedAmount = Number(discountAmount || promoDoc?.discountAmount);
  if (!Number.isNaN(normalizedAmount)) summary.amount = normalizedAmount;

  return summary;
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

    const deliveryOption = body.deliverySelection || body.delivery || null;
    const deliveryOptionRecord =
      (deliveryOption as Record<string, unknown>) || null;

    const delivery = await resolveDelivery(cart, {
      methodId:
        toTrimmedString(body.deliveryMethodId) ||
        coalesceString(deliveryOptionRecord, ["id", "_id", "setting"]),
      method:
        toTrimmedString(body.deliveryMethod) ||
        coalesceString(deliveryOptionRecord, ["method"]),
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

    const promoSummary = buildPromoSummary(cart.promoCode, discount);

    const orderSummary = {
      subTotal,
      discount,
      deliveryFee,
      serviceTax,
      total,
      promoCode: promoSummary?.code ?? null,
      promo: promoSummary,
    };

    const contactDetails =
      normalizeContact(body.contact) ||
      normalizeContact(body.personalDetails) ||
      normalizeContact(body.customer) ||
      normalizeContact(body.shippingAddress as ContactPayload) ||
      normalizeContact(body.address as ContactPayload);

    const shippingAddress = normalizeAddress(
      (body.shippingAddress as Partial<IShippingAddress>) ||
        (body.address as Partial<IShippingAddress>),
      contactDetails
    );

    const payment = normalizePayment(body);

    const orderPayload: Record<string, any> = {
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
      summary: orderSummary,
      payment,
      shippingAddress,
      delivery,
      promoCode:
        cart.promoCode && typeof (cart.promoCode as any)._id !== "undefined"
          ? (cart.promoCode as any)._id
          : cart.promoCode || null,
      notes: body.notes?.toString().trim() || undefined,
      contact: contactDetails,
    };

    if (shippingAddress) orderPayload.shippingAddress = shippingAddress;
    if (contactDetails) orderPayload.contact = contactDetails;

    const order = new Order(orderPayload);

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
