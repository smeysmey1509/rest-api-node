import { Request } from "express";

export const categoryCreateValidation = (req: Request) => {
  const errors: string[] = [];
  if (!(req.body?.categoryName || req.body?.name)) errors.push("categoryName or name is required");
  return errors;
};
