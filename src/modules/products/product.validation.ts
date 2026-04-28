import { Request } from "express";

export const productCreateValidation = (req: Request) => {
  const errors: string[] = [];
  if (!req.body?.name) errors.push("name is required");
  if (!req.body?.category) errors.push("category is required");
  return errors;
};
