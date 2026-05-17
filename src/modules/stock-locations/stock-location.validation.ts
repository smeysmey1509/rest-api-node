import { Request } from "express";

export const stockLocationValidation = (req: Request) => {
  const errors: string[] = [];
  if (!req.body?.name) errors.push("name is required");
  if (!req.body?.code) errors.push("code is required");
  if (!["WAREHOUSE", "STORE", "POS_BRANCH"].includes(String(req.body?.type || "").toUpperCase())) {
    errors.push("type must be WAREHOUSE, STORE, or POS_BRANCH");
  }
  return errors;
};
