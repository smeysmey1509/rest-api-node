import Product from "../products/product.model";
import PromoCode from "../../models/PromoCode";
import PromoUsage from "../../models/PromoUsage";
import DeliverySetting from "../../models/DeliverySetting";
import { calculateCartTotals } from "../../main/utils/cartTotals";
import { invalidateCart, setCachedCart } from "../../main/utils/cache";
import { sanitizeCartItems } from "../../main/utils/cartSanitizer";
import { AppError } from "../../common/utils/appError";
import { cartRepository } from "./cart.repository";

const subtotalFromCart = (cart: any): number =>
  (cart.items || []).reduce((acc: number, item: any) => {
    const price = item.product?.price || 0;
    return acc + price * item.quantity;
  }, 0);

const computeTaxRate = (subTotal: number, discount: number, serviceTax: number) => {
  const taxableBase = Math.max(subTotal - discount, 0);
  if (taxableBase <= 0) return 0;
  return Number((serviceTax / taxableBase).toFixed(4));
};

const buildPromoSummary = (promo: any, discountAmount: number) => {
  if (!promo) return null;
  const promoDoc = typeof promo?.toObject === "function" ? promo.toObject() : promo;
  const code = typeof promoDoc === "string" ? promoDoc : promoDoc?.code ?? promoDoc?.Code ?? null;
  if (!code) return null;
  return {
    code,
    type: promoDoc?.discountType,
    value: promoDoc?.discountValue,
    maxUsesPerUser: promoDoc?.maxUsesPerUser,
    expiresAt: promoDoc?.expiresAt,
    amount: Number(discountAmount || 0),
  };
};

const resolveDeliveryMethod = async (cart: any): Promise<string> => {
  const chosen = cart?.delivery as any;
  if (chosen?.method) return String(chosen.method).toLowerCase();
  const active = await DeliverySetting.findOne({ isActive: true }).lean();
  return String(active?.method || "standard").toLowerCase();
};

export const buildCartResponse = async (cartDoc: any) => {
  await cartDoc.populate("items.product");
  await cartDoc.populate("promoCode");
  await cartDoc.populate("delivery");

  const deliveryDoc =
    cartDoc.delivery ||
    (await DeliverySetting.findOne({ isActive: true }).lean()) || {
      _id: null,
      method: "standard",
      baseFee: 0,
      taxRate: 0,
    };

  const subTotal = subtotalFromCart(cartDoc);
  const discount = cartDoc.discount || 0;
  const hasItems = Array.isArray(cartDoc.items) && cartDoc.items.length > 0;

  if (!hasItems || subTotal <= 0) {
    cartDoc.subTotal = 0;
    cartDoc.discount = 0;
    cartDoc.serviceTax = 0;
    cartDoc.deliveryFee = 0;
    cartDoc.total = 0;
    cartDoc.promoCode = null as any;
    await cartDoc.save();

    return {
      _id: cartDoc._id,
      user: cartDoc.user,
      items: sanitizeCartItems(cartDoc.items),
      promoCode: null,
      delivery: deliveryDoc,
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
      createdAt: cartDoc.createdAt,
      updatedAt: cartDoc.updatedAt,
    };
  }

  const method = String(deliveryDoc.method || "standard").toLowerCase();
  const { serviceTax, deliveryFee, total } = await calculateCartTotals(subTotal, discount, method);
  const promoSummary = buildPromoSummary(cartDoc.promoCode, discount);
  const taxRate = computeTaxRate(subTotal, discount, serviceTax);

  cartDoc.subTotal = subTotal;
  cartDoc.serviceTax = serviceTax;
  cartDoc.deliveryFee = deliveryFee;
  cartDoc.total = total;
  await cartDoc.save();

  return {
    _id: cartDoc._id,
    user: cartDoc.user,
    items: sanitizeCartItems(cartDoc.items),
    promoCode: cartDoc.promoCode,
    delivery: deliveryDoc,
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
    createdAt: cartDoc.createdAt,
    updatedAt: cartDoc.updatedAt,
  };
};

export const cartService = {
  async get(userId: string) {
    const cart = await cartRepository.findPopulatedByUser(userId);
    if (!cart) {
      return {
        items: [],
        promoCode: null,
        delivery: null,
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
    }
    const response = await buildCartResponse(cart);
    await setCachedCart(userId, response);
    return response;
  },

  async add(userId: string, productId: string, quantity = 1) {
    const product = await Product.findById(productId);
    if (!product) throw new AppError("Product not found.", 404);

    let cart = await cartRepository.findByUser(userId);
    if (!cart) cart = cartRepository.createForUser(userId);

    const safeQuantity = Math.max(1, Number(quantity) || 1);
    const idx = cart.items.findIndex((item) => String(item.product) === String(productId));
    if (idx > -1) cart.items[idx].quantity += safeQuantity;
    else cart.items.push({ product: productId as any, quantity: safeQuantity });

    await cart.save();
    const response = await buildCartResponse(cart);
    await setCachedCart(userId, response);
    return response;
  },

  async remove(userId: string, productId: string) {
    const cart = await cartRepository.findByUser(userId);
    if (!cart) throw new AppError("Cart not found.", 404);
    cart.items = cart.items.filter((item) => String(item.product) !== String(productId));
    await cart.save();
    const response = await buildCartResponse(cart);
    await setCachedCart(userId, response);
    return response;
  },

  async updateQuantity(userId: string, productId: string, quantity: number) {
    if (quantity < 1) throw new AppError("Quantity must be at least 1.", 400);
    const cart = await cartRepository.findByUser(userId);
    if (!cart) throw new AppError("Cart not found.", 404);
    const item = cart.items.find((cartItem) => String(cartItem.product) === String(productId));
    if (!item) throw new AppError("Product not found in cart.", 404);
    item.quantity = quantity;
    await cart.save();
    await invalidateCart(userId);
    return buildCartResponse(cart);
  },

  async clear(userId: string) {
    const cart = await cartRepository.findByUser(userId);
    if (!cart) throw new AppError("Cart not found.", 404);
    cart.items = [];
    cart.discount = 0;
    cart.promoCode = null as any;
    cart.subTotal = 0;
    cart.serviceTax = 0;
    cart.deliveryFee = 0;
    cart.total = 0;
    await cart.save();
    await invalidateCart(userId);
    return { msg: "Cart cleared." };
  },

  async applyPromo(userId: string, code: string) {
    if (!code) throw new AppError("Promo code is required.", 400);
    const promo = await PromoCode.findOne({ code: code.toUpperCase(), isActive: true });
    if (!promo) throw new AppError("Promo code not found or inactive.", 404);
    if (promo.expiresAt < new Date()) throw new AppError("Promo code has expired.", 400);

    const usage = await PromoUsage.findOne({ user: userId, promoCode: promo._id });
    if (usage && usage.usageCount >= promo.maxUsesPerUser) {
      throw new AppError(`Promo code usage limit reached (${promo.maxUsesPerUser} times).`, 400);
    }

    const cart = await cartRepository.findPopulatedByUser(userId);
    if (!cart) throw new AppError("Cart not found.", 404);

    const subtotal = subtotalFromCart(cart);
    const discountAmount =
      promo.discountType === "percentage"
        ? subtotal * (promo.discountValue / 100)
        : promo.discountValue;
    const method = await resolveDeliveryMethod(cart);
    const { serviceTax, deliveryFee, total } = await calculateCartTotals(subtotal, discountAmount, method);

    cart.promoCode = promo._id as any;
    cart.discount = discountAmount;
    cart.subTotal = subtotal;
    cart.serviceTax = serviceTax;
    cart.deliveryFee = deliveryFee;
    cart.total = total;
    await cart.save();
    await invalidateCart(userId);

    return {
      success: true,
      message: "Promo code applied successfully.",
      promo: {
        code: promo.code,
        type: promo.discountType,
        value: promo.discountValue,
        amount: discountAmount,
        usageCount: usage?.usageCount ?? 0,
        maxUsesPerUser: promo.maxUsesPerUser,
        expiresAt: promo.expiresAt,
      },
    };
  },

  async removePromo(userId: string) {
    const cart = await cartRepository.findPopulatedByUser(userId);
    if (!cart) throw new AppError("Cart not found.", 404);
    cart.promoCode = null as any;
    cart.discount = 0;
    await cart.save();
    await invalidateCart(userId);
    return buildCartResponse(cart);
  },

  async selectDelivery(userId: string, method: string) {
    if (!method) throw new AppError("Delivery method is required.", 400);
    const delivery = await DeliverySetting.findOne({ method, isActive: true });
    if (!delivery) throw new AppError("Delivery method not found.", 404);
    const cart = await cartRepository.findByUser(userId);
    if (!cart) throw new AppError("Cart not found.", 404);
    cart.delivery = delivery._id as any;
    await cart.save();
    await invalidateCart(userId);
    return buildCartResponse(cart);
  },
};
