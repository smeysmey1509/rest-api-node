export type InventoryMovementType =
  | "STOCK_IN"
  | "STOCK_OUT"
  | "RESERVED"
  | "RESERVATION_RELEASED"
  | "SOLD"
  | "RETURNED"
  | "TRANSFERRED"
  | "ADJUSTED"
  | "DAMAGED"
  | "REPAIR";

export type InventoryReferenceType =
  | "PURCHASE_ORDER"
  | "ORDER"
  | "RETURN"
  | "TRANSFER"
  | "MANUAL_ADJUSTMENT"
  | "SYSTEM";
