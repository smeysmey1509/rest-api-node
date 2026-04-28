export const OrderStatus = {
  PENDING_PAYMENT: "PENDING_PAYMENT",
  PAID: "PAID",
  PROCESSING: "PROCESSING",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
  FAILED: "FAILED",
} as const;

export type OrderStatusValue = (typeof OrderStatus)[keyof typeof OrderStatus];

const legacyOrderStatusMap: Record<string, OrderStatusValue> = {
  pending: OrderStatus.PENDING_PAYMENT,
  paid: OrderStatus.PAID,
  processing: OrderStatus.PROCESSING,
  shipped: OrderStatus.SHIPPED,
  delivered: OrderStatus.DELIVERED,
  cancelled: OrderStatus.CANCELLED,
  refunded: OrderStatus.REFUNDED,
  failed: OrderStatus.FAILED,
};

export const normalizeOrderStatus = (status?: string): OrderStatusValue => {
  if (!status) return OrderStatus.PENDING_PAYMENT;
  const upper = status.toUpperCase();
  if (Object.values(OrderStatus).includes(upper as OrderStatusValue)) {
    return upper as OrderStatusValue;
  }
  return legacyOrderStatusMap[status.toLowerCase()] || OrderStatus.PENDING_PAYMENT;
};
