export type ProductActivityAction = "PRODUCT_CREATED" | "PRODUCT_UPDATED" | "PRODUCT_DELETED";

export type ProductActivityPayload = {
  action: ProductActivityAction;
  productId?: string;
  productIds?: string[];
  userId?: string;
  occurredAt: string;
};
