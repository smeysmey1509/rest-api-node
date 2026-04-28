import { AppError } from "../../common/utils/appError";
import { normalizeOrderStatus, OrderStatus } from "../../common/constants/orderStatus";
import { PaymentStatus } from "../../common/constants/paymentStatus";
import { paymentService } from "../payments/payment.service";
import { orderRepository } from "./order.repository";

const cancellableStatuses = [OrderStatus.PENDING_PAYMENT, "pending"];

export const orderService = {
  listMine(userId: string) {
    return orderRepository.listByUser(userId);
  },

  listAll() {
    return orderRepository.listAll();
  },

  async cancel(userId: string, orderId: string) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new AppError("Order not found", 404);
    if (String(order.user) !== String(userId)) throw new AppError("Forbidden", 403);
    if (!cancellableStatuses.includes(order.status as any)) {
      throw new AppError("Order cannot be cancelled at this stage.", 400);
    }
    order.status = OrderStatus.CANCELLED as any;
    order.statusHistory = [
      ...(order.statusHistory || []),
      { status: OrderStatus.CANCELLED as any, message: "Order cancelled by customer.", updatedAt: new Date() },
    ];
    order.payment = { ...(order.payment || {}), status: PaymentStatus.CANCELLED as any };
    await order.save();
    await paymentService.markFailedByOrder(orderId, PaymentStatus.CANCELLED);
    return order;
  },

  async updateStatus(orderId: string, status: string) {
    const normalized = normalizeOrderStatus(status);
    if (normalized === OrderStatus.PAID) {
      throw new AppError("Use payment confirmation to mark an order as paid.", 400);
    }
    const order = await orderRepository.findById(orderId);
    if (!order) throw new AppError("Order not found", 404);
    order.status = normalized as any;
    order.statusHistory = [
      ...(order.statusHistory || []),
      { status: normalized as any, message: "Order status updated by admin.", updatedAt: new Date() },
    ];
    await order.save();
    return order;
  },
};
