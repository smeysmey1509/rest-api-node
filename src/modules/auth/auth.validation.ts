import { Request } from "express";

export const registerValidation = (req: Request) => {
  const errors: string[] = [];
  if (!req.body?.name) errors.push("name is required");
  if (!req.body?.email) errors.push("email is required");
  if (!req.body?.password) errors.push("password is required");
  return errors;
};

export const loginValidation = (req: Request) => {
  const errors: string[] = [];
  if (!(req.body?.identifier || req.body?.email || req.body?.name)) {
    errors.push("identifier, email, or name is required");
  }
  if (!req.body?.password) errors.push("password is required");
  return errors;
};
