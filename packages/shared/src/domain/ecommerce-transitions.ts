import { TransitionMap } from "./state-machine";

export const orderStates = [
  "PENDING_PAYMENT", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "COMPLETED", "CANCELLED", "FAILED",
] as const;
export type OrderState = (typeof orderStates)[number];
export const orderTransitions: TransitionMap<OrderState> = {
  PENDING_PAYMENT: ["CONFIRMED", "CANCELLED", "FAILED"],
  CONFIRMED: ["PROCESSING"],
  PROCESSING: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["COMPLETED"],
  COMPLETED: [], CANCELLED: [], FAILED: [],
};

export const paymentStates = [
  "PENDING", "AUTHORIZED", "SUCCESS", "FAILED", "CANCELLED", "PARTIALLY_REFUNDED", "REFUNDED",
] as const;
export type PaymentState = (typeof paymentStates)[number];
export const paymentTransitions: TransitionMap<PaymentState> = {
  PENDING: ["AUTHORIZED", "SUCCESS", "FAILED", "CANCELLED"],
  AUTHORIZED: ["SUCCESS"],
  SUCCESS: ["PARTIALLY_REFUNDED", "REFUNDED"],
  PARTIALLY_REFUNDED: ["REFUNDED"],
  FAILED: [], CANCELLED: [], REFUNDED: [],
};

export const inventoryUnitStates = [
  "AVAILABLE", "RESERVED", "SOLD", "RETURNED", "DAMAGED", "REPAIR", "LOST",
] as const;
export type InventoryUnitState = (typeof inventoryUnitStates)[number];
export const inventoryUnitTransitions: TransitionMap<InventoryUnitState> = {
  AVAILABLE: ["RESERVED"],
  RESERVED: ["SOLD", "AVAILABLE"],
  SOLD: ["RETURNED"],
  RETURNED: ["AVAILABLE", "DAMAGED", "REPAIR", "LOST"],
  DAMAGED: [], REPAIR: [], LOST: [],
};

export const invoiceStates = ["DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "CLOSED", "VOID"] as const;
export type InvoiceState = (typeof invoiceStates)[number];
export const invoiceTransitions: TransitionMap<InvoiceState> = {
  DRAFT: ["ISSUED", "VOID"],
  ISSUED: ["PARTIALLY_PAID", "PAID", "VOID"],
  PARTIALLY_PAID: ["PAID"],
  PAID: ["CLOSED"],
  CLOSED: [], VOID: [],
};

