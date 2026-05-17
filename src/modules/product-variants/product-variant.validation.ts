import { Request } from "express";

export const productVariantCreateValidation = (req: Request) => {
  const errors: string[] = [];
  if (!req.params.productId) errors.push("productId is required");
  if (!req.body?.sku) errors.push("sku is required");
  const salePrice = Number(req.body?.pricing?.salePrice ?? req.body?.salePrice ?? req.body?.price ?? 0);
  if (!Number.isFinite(salePrice) || salePrice < 0) errors.push("salePrice must be greater than or equal to 0");
  const costPrice = req.body?.pricing?.costPrice ?? req.body?.costPrice;
  if (costPrice !== undefined && Number(costPrice) < 0) errors.push("costPrice must be greater than or equal to 0");
  return errors;
};
