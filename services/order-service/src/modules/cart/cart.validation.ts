import { Request } from "express";

export const addCartValidation = (req: Request) => {
  const errors: string[] = [];
  if (!req.body?.productId) errors.push("productId is required");
  return errors;
};
