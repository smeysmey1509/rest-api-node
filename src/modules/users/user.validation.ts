import { Request } from "express";

export const updateStatusValidation = (req: Request) => {
  const errors: string[] = [];
  if (!req.body?.status) errors.push("status is required");
  return errors;
};
