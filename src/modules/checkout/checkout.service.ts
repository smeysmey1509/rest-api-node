import { Types } from "mongoose";
import Cart from "../cart/cart.model";
import Order, {
  IContactDetails,
  IDeliverySummary,
  IShippingAddress,
} from "../orders/order.model";
import DeliverySetting from "../inventory/delivery-setting.model";
import PromoCode from "../coupons/coupon.model";
import PromoUsage from "../coupons/coupon-usage.model";
import { calculateCartTotals } from "../../shared/helpers/cart-totals";
import { invalidateCart, setCachedCart } from "../../infrastructure/redis/cache";
import { AppError } from "../../shared/errors/app-error";
import { OrderStatus } from "../../shared/constants/orderStatus";
import { PaymentStatus } from "../../shared/constants/paymentStatus";
import { paymentService } from "../payments/payment.service";

type CheckoutBody = Record<string, any>;

const toTrimmedString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const str = String(value).trim();
  return str.length ? str : undefined;
};

const coalesceString = (source: Record<string, unknown> | null | undefined, keys: string[]) => {
  if (!source) return undefined;
  for (const key of keys) {
    const value = toTrimmedString(source[key]);
    if (value) return value;
  }
  return undefined;
};

const normalizeContact = (payload?: Record<string, any> | null): IContactDetails | undefined => {
  if (!payload) return undefined;
  const firstName = toTrimmedString(payload.firstName);
  const lastName = toTrimmedString(payload.lastName);
  const fullName = toTrimmedString(payload.fullName) || toTrimmedString(payload.name) || [firstName, lastName].filter(Boolean).join(" ");
  const email = toTrimmedString(payload.email) || toTrimmedString(payload.contactEmail);
  const phone = toTrimmedString(payload.phone) || toTrimmedString(payload.contactPhone) || toTrimmedString(payload.mobile);
  if (!fullName && !email && !phone) return undefined;
  return { fullName, email, phone };
};

const normalizeAddress = (
  payload?: Record<string, any> | null,
  fallbackContact?: IContactDetails
): IShippingAddress | undefined => {
  if (!payload) return undefined;
  const line1 = coalesceString(payload, ["line1", "address1", "addressLine1", "street", "address"]);
  const country = coalesceString(payload, ["country", "countryCode", "countryName"]);
  if (!line1 || !country) throw new AppError("Shipping address requires line1 and country.", 400);
  return {
    fullName: coalesceString(payload, ["fullName", "name", "recipientName"]) || fallbackContact?.fullName,
    phone: coalesceString(payload, ["phone", "contactNumber", "contactPhone", "mobile"]) || fallbackContact?.phone,
    email: coalesceString(payload, ["email"]) || fallbackContact?.email,
    line1,
    line2: coalesceString(payload, ["line2", "address2", "addressLine2", "apartment"]),
    city: coalesceString(payload, ["city", "town"]),
    state: coalesceString(payload, ["state", "province", "region"]),
    postalCode: coalesceString(payload, ["postalCode", "zip", "zipCode", "postcode"]),
    country,
    type: coalesceString(payload, ["type", "addressType"]),
    isDefault: Boolean(payload.isDefault),
  };
};

const buildPromoSummary = (promo: any, discountAmount: number) => {
  if (!promo) return null;
  const promoDoc = typeof promo?.toObject === "function" ? promo.toObject() : promo;
  const code = typeof promoDoc === "string" ? promoDoc : promoDoc?.code ?? null;
  if (!code) return null;
  return {
    code,
    type: promoDoc.discountType,
    value: promoDoc.discountValue,
    amount: discountAmount,
    maxUsesPerUser: promoDoc.maxUsesPerUser,
    expiresAt: promoDoc.expiresAt,
  };
};

const resolveDelivery = async (cart: any, body: CheckoutBody): Promise<IDeliverySummary | undefined> => {
  const selection = body.deliverySelection || body.delivery || {};
  const methodId = toTrimmedString(body.deliveryMethodId) || toTrimmedString(selection.id) || toTrimmedString(selection._id) || toTrimmedString(selection.setting);
  const method = toTrimmedString(body.deliveryMethod) || toTrimmedString(selection.method);

  const doc =
    (methodId ? await DeliverySetting.findById(methodId).lean() : null) ||
    (method ? await DeliverySetting.findOne({ method, isActive: true }).lean() : null) ||
    (cart.delivery?.method ? cart.delivery : null) ||
    (await DeliverySetting.findOne({ isActive: true }).lean());

  if (!doc) return undefined;
  const rawId = doc._id || doc.id || null;
  return {
    setting: rawId && Types.ObjectId.isValid(rawId) ? new Types.ObjectId(String(rawId)) : null,
    method: doc.method,
    baseFee: doc.baseFee,
    estimatedDays: doc.estimatedDays,
    code: doc.code,
    carrier: undefined,
    trackingNumber: undefined,
    trackingUrl: undefined,
    estimatedDeliveryDate: null,
  };
};

const incrementPromoUsage = async (userId: string, promoCodeId: Types.ObjectId, maxUsesPerUser: number) => {
  return PromoUsage.findOneAndUpdate(
    {
      user: userId,
      promoCode: promoCodeId,
      $or: [{ usageCount: { $lt: maxUsesPerUser } }, { usageCount: { $exists: false } }],
    },
    {
      $inc: { usageCount: 1 },
      $setOnInsert: { user: userId, promoCode: promoCodeId },
    },
    { new: true, upsert: true }
  );
};

export const checkoutService = {
  async checkout(userId: string, body: CheckoutBody) {
    const cart = await Cart.findOne({ user: userId })
      .populate("items.product")
      .populate("promoCode")
      .populate("delivery");

    if (!cart || cart.items.length === 0) throw new AppError("Cart is empty.", 400);

    const delivery = await resolveDelivery(cart, body);
    if (!delivery) throw new AppError("No delivery methods are currently available.", 400);

    for (const item of cart.items as any[]) {
      const product = item.product;
      if (!product || product.isDeleted) throw new AppError("One of the products is unavailable.", 400);
      if (typeof product.stock === "number" && product.stock < item.quantity) {
        throw new AppError(`Not enough stock for ${product.name}.`, 400);
      }
    }

    const subTotal = (cart.items as any[]).reduce((acc, item) => acc + (item.product?.price || 0) * item.quantity, 0);
    const discount = cart.discount || 0;
    const { serviceTax, deliveryFee, total } = await calculateCartTotals(subTotal, discount, delivery.method || "standard");
    const taxableBase = Math.max(subTotal - discount, 0);
    const taxRate = taxableBase > 0 ? Number((serviceTax / taxableBase).toFixed(4)) : 0;
    const promoSummary = buildPromoSummary(cart.promoCode, discount);

    let promoToConsume: { id: Types.ObjectId; maxUsesPerUser: number } | null = null;
    if (cart.promoCode) {
      const promoRecord =
        typeof (cart.promoCode as any).toObject === "function"
          ? (cart.promoCode as any)
          : await PromoCode.findById(cart.promoCode);
      if (!promoRecord) throw new AppError("Promo code not found.", 400);
      if (!promoRecord.isActive) throw new AppError("Promo code is inactive.", 400);
      if (promoRecord.expiresAt < new Date()) throw new AppError("Promo code has expired.", 400);
      const usage = await PromoUsage.findOne({ user: userId, promoCode: promoRecord._id });
      if (usage && usage.usageCount >= promoRecord.maxUsesPerUser) {
        throw new AppError(`Promo code usage limit reached (${promoRecord.maxUsesPerUser} times).`, 400);
      }
      promoToConsume = { id: promoRecord._id, maxUsesPerUser: promoRecord.maxUsesPerUser };
    }

    const contact =
      normalizeContact(body.contact) ||
      normalizeContact(body.personalDetails) ||
      normalizeContact(body.customer) ||
      normalizeContact(body.shippingAddress) ||
      normalizeContact(body.address);
    const shippingAddress = normalizeAddress(body.shippingAddress || body.address, contact);
    const paymentMethod = paymentService.normalizePaymentMethod(body.paymentMethod || body.payment?.method);

    const order = new Order({
      user: userId,
      items: (cart.items as any[]).map((item) => ({
        product: item.product._id,
        name: item.product.name,
        slug: item.product.slug,
        image: Array.isArray(item.product.images) ? item.product.images[0] : undefined,
        price: item.product.price,
        quantity: item.quantity,
      })),
      subTotal,
      discount,
      deliveryFee,
      serviceTax,
      total,
      status: OrderStatus.PENDING_PAYMENT,
      statusHistory: [
        {
          status: OrderStatus.PENDING_PAYMENT,
          message: "Order created, awaiting payment.",
          updatedAt: new Date(),
        },
      ],
      summary: {
        subTotal,
        discount,
        deliveryFee,
        serviceTax,
        total,
        taxRate,
        promoCode: promoSummary?.code ?? null,
        promo: promoSummary,
      },
      payment: {
        method: paymentMethod,
        status: PaymentStatus.PENDING,
        currency: body.payment?.currency || body.currency || "USD",
        transactionId: body.transactionId,
        paidAt: null,
      },
      shippingAddress,
      delivery,
      promoCode:
        cart.promoCode && typeof (cart.promoCode as any)._id !== "undefined"
          ? (cart.promoCode as any)._id
          : cart.promoCode || null,
      notes: body.notes?.toString().trim() || undefined,
      contact,
    });

    await order.save();

    if (promoToConsume) {
      const updated = await incrementPromoUsage(userId, promoToConsume.id, promoToConsume.maxUsesPerUser);
      if (!updated) {
        await Order.findByIdAndDelete(order._id);
        throw new AppError(`Promo code usage limit reached (${promoToConsume.maxUsesPerUser} times).`, 400);
      }
    }

    const payment = await paymentService.createForOrder(order, paymentMethod);

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
        taxRate: 0,
        promoCode: null,
        promo: null,
      },
    };
    await setCachedCart(userId, emptyCartPayload);
    await invalidateCart(userId);

    return { order, payment };
  },
};
