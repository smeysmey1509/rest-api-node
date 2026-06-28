import { Request } from "express";

export const supplierValidation = (req: Request) => {
  const errors: string[] = [];
  if (!req.body?.name) errors.push("name is required");
  if (req.body?.email && !String(req.body.email).includes("@")) errors.push("email is invalid");
  return errors;
};
