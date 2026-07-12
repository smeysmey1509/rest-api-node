export const EventNames = {
  UserCreated: "user.created",
  InventoryStocked: "inventory.stocked",
  InventoryReserved: "inventory.reserved",
  InventoryReleased: "inventory.released",
  InventoryReservationExpired: "inventory.reservation_expired",
  OrderCreated: "order.created",
  PaymentCompleted: "payment.completed",
  PaymentFailed: "payment.failed",
  InvoiceIssued: "invoice.issued",
  ShipmentCreated: "shipment.created",
  ShipmentDelivered: "shipment.delivered",
  RefundCompleted: "refund.completed",
} as const;

export type EventName = (typeof EventNames)[keyof typeof EventNames];

