import { Request } from "express";

export const brandCreateValidation = (req: Request) => {
  const errors: string[] = [];
  if (!req.body?.name) errors.push("name is required");
  return errors;
};
