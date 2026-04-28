import mongoose from "mongoose";
import Order from "../orders/order.model";
import Product from "../products/product.model";
import Payment, {
  IPayment,
  PaymentMethod,
  PaymentMethodValue,
} from "./payment.model";
import { paymentRepository } from "./payment.repository";
import {
  PaymentStatus,
  PaymentStatusValue,
} from "../../common/constants/paymentStatus";
import { OrderStatus } from "../../common/constants/orderStatus";
import { AppError } from "../../common/utils/appError";
import { abaGateway } from "./gateways/aba.gateway";
import { khqrGateway } from "./gateways/khqr.gateway";
import { cardGateway } from "./gateways/card.gateway";
import { bankTransferGateway } from "./gateways/bankTransfer.gateway";
import { cashOnDeliveryGateway } from "./gateways/cashOnDelivery.gateway";
import { PaymentGateway } from "./gateways/paymentGateway";

const normalizePaymentMethod = (method?: string): PaymentMethodValue => {
  const normalized = String(method || PaymentMethod.CASH_ON_DELIVERY).toUpperCase();
  if (Object.values(PaymentMethod).includes(normalized as PaymentMethodValue)) {
    return normalized as PaymentMethodValue;
  }
  throw new AppError("Unsupported payment method", 400);
};

const createTransactionId = () => {
  const timestamp = Date.now().toString().slice(-10);
  const suffix = Math.random().toString().slice(2, 8);
  return `${timestamp}${suffix}`;
};

const getGateway = (method: PaymentMethodValue): PaymentGateway => {
  switch (method) {
    case PaymentMethod.ABA_PAY:
      return abaGateway;
    case PaymentMethod.KHQR:
      return khqrGateway;
    case PaymentMethod.VISA_MASTER:
      return cardGateway;
    case PaymentMethod.BANK_TRANSFER:
      return bankTransferGateway;
    case PaymentMethod.CASH_ON_DELIVERY:
      return cashOnDeliveryGateway;
    default:
      return cashOnDeliveryGateway;
  }
};

const getProvider = (method: PaymentMethodValue) => {
  if (method === PaymentMethod.ABA_PAY || method === PaymentMethod.KHQR) return "PAYWAY";
  if (method === PaymentMethod.VISA_MASTER) return "PAYWAY_CARD";
  return method;
};

const isExternalVerifiedMethod = (method: PaymentMethodValue) =>
  method === PaymentMethod.ABA_PAY || method === PaymentMethod.KHQR;

export const paymentService = {
  normalizePaymentMethod,

  async createForOrder(order: any, methodInput?: string) {
    const method = normalizePaymentMethod(methodInput);
    const payment = await paymentRepository.create({
      order: order._id,
      user: order.user,
      method,
      provider: getProvider(method),
      status: PaymentStatus.PENDING,
      amount: order.total,
      currency: order.payment?.currency || "USD",
      transactionId: createTransactionId(),
      merchantRef: String(order._id),
      metadata: {
        orderStatus: order.status,
      },
    } as Partial<IPayment>);

    const gateway = getGateway(method);
    const gatewayResult = await gateway.initiate({ payment, order, method });
    payment.provider = gatewayResult.provider;
    payment.gatewayReference = gatewayResult.gatewayReference;
    payment.gatewayStatus = gatewayResult.status;
    payment.checkoutData = gatewayResult.checkoutData || {};
    await payment.save();

    order.payment = {
      ...(order.payment || {}),
      method,
      status: PaymentStatus.PENDING,
      transactionId: payment.transactionId,
      currency: payment.currency,
      paidAt: null,
    };
    await order.save();

    return payment;
  },

  async getById(id: string) {
    const payment = await paymentRepository.findById(id);
    if (!payment) throw new AppError("Payment not found", 404);
    return payment;
  },

  async verifyPayment(id: string) {
    const payment = await paymentRepository.findById(id);
    if (!payment) throw new AppError("Payment not found", 404);

    if (!isExternalVerifiedMethod(payment.method)) {
      return payment;
    }

    const result = await getGateway(payment.method).verify(payment.transactionId);
    if (result.success) {
      return this.markSuccess(payment, result.raw, result.paidAt || new Date());
    }

    payment.gatewayStatus = result.status;
    payment.metadata = { ...(payment.metadata || {}), lastVerification: result.raw };
    await payment.save();
    return payment;
  },

  async handlePaywayWebhook(payload: Record<string, any>) {
    const transactionId =
      payload.tran_id ||
      payload.transaction_id ||
      payload.merchant_ref ||
      payload.merchant_ref_no;
    if (!transactionId) throw new AppError("Payment transaction reference is required", 400);

    const payment = await paymentRepository.findByTransaction(String(transactionId));
    if (!payment) throw new AppError("Payment not found", 404);

    const result = await getGateway(payment.method).verify(payment.transactionId);
    if (result.success) {
      return this.markSuccess(payment, { webhook: payload, verification: result.raw }, result.paidAt || new Date());
    }

    payment.gatewayStatus = result.status;
    payment.metadata = { ...(payment.metadata || {}), webhook: payload, verification: result.raw };
    await payment.save();
    return payment;
  },

  async markManualSuccess(id: string) {
    const payment = await paymentRepository.findById(id);
    if (!payment) throw new AppError("Payment not found", 404);
    if (isExternalVerifiedMethod(payment.method)) {
      throw new AppError("External payments must be verified through the gateway.", 400);
    }
    return this.markSuccess(payment, { manual: true }, new Date());
  },

  async markSuccess(payment: IPayment, raw: unknown, paidAt: Date) {
    if (payment.status === PaymentStatus.SUCCESS) return payment;

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const freshPayment = await Payment.findById(payment._id).session(session);
      if (!freshPayment) throw new AppError("Payment not found", 404);
      if (freshPayment.status === PaymentStatus.SUCCESS) {
        await session.commitTransaction();
        return freshPayment;
      }

      const order = await Order.findById(freshPayment.order).session(session);
      if (!order) throw new AppError("Order not found", 404);

      for (const item of order.items) {
        const result = await Product.updateOne(
          { _id: item.product, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity, salesCount: item.quantity } },
          { session }
        );
        if (result.modifiedCount !== 1) {
          throw new AppError(`Not enough stock for ${item.name}.`, 400);
        }
      }

      freshPayment.status = PaymentStatus.SUCCESS;
      freshPayment.verifiedAt = new Date();
      freshPayment.paidAt = paidAt;
      freshPayment.gatewayStatus = "APPROVED";
      freshPayment.metadata = { ...(freshPayment.metadata || {}), confirmation: raw };
      await freshPayment.save({ session });

      order.status = OrderStatus.PAID as any;
      order.payment = {
        ...(order.payment || {}),
        method: freshPayment.method,
        status: PaymentStatus.SUCCESS as any,
        transactionId: freshPayment.transactionId,
        currency: freshPayment.currency,
        paidAt,
      };
      order.statusHistory = [
        ...(order.statusHistory || []),
        {
          status: OrderStatus.PAID as any,
          message: "Payment confirmed by backend.",
          updatedAt: new Date(),
        },
      ];
      await order.save({ session });

      await session.commitTransaction();
      return freshPayment;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  },

  async markFailedByOrder(
    orderId: string,
    status: PaymentStatusValue = PaymentStatus.FAILED
  ) {
    const payment = await paymentRepository.findByOrder(orderId);
    if (!payment) return null;
    payment.status = status;
    await payment.save();
    return payment;
  },
};
