export type ProductActivityAction =
  | "PRODUCT_CREATED"
  | "PRODUCT_UPDATED"
  | "PRODUCT_DELETED"
  | "STOCK_IN_CREATED"
  | "INVENTORY_RESERVED"
  | "INVENTORY_SOLD"
  | "INVENTORY_RETURNED";

export type ProductActivityPayload = {
  action: ProductActivityAction;
  productId?: string;
  productIds?: string[];
  userId?: string;
  occurredAt: string;
};
