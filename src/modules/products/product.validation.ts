import { Request } from "express";

export const productCreateValidation = (req: Request) => {
  const errors: string[] = [];
  if (!req.body?.name) errors.push("name is required");
  if (!req.body?.category && !req.body?.categoryId) errors.push("category is required");
  if (req.body?.trackingType && !["SERIAL", "BATCH", "NONE"].includes(String(req.body.trackingType).toUpperCase())) {
    errors.push("trackingType must be SERIAL, BATCH, or NONE");
  }
  if (
    req.body?.productType &&
    !["PHONE", "LAPTOP", "COMPUTER", "TABLET", "ACCESSORY", "ELECTRONIC", "OTHER"].includes(
      String(req.body.productType).toUpperCase()
    )
  ) {
    errors.push("productType is invalid");
  }
  return errors;
};
