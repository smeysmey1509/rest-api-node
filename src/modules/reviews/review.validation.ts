import { Request } from "express";

export const reviewCreateValidation = (req: Request) => {
  const errors: string[] = [];
  if (!(req.body?.productId || req.body?.product)) errors.push("productId is required");
  if (!req.body?.rating) errors.push("rating is required");
  return errors;
};
