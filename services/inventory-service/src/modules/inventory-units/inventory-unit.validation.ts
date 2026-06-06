import { Request } from "express";

export const stockInValidation = (req: Request) => {
  const errors: string[] = [];
  if (!req.body?.productId) errors.push("productId is required");
  if (!req.body?.variantId) errors.push("variantId is required");
  if (!req.body?.locationId) errors.push("locationId is required");
  if (!Array.isArray(req.body?.units) || req.body.units.length === 0) errors.push("units is required");
  if (req.body?.costPrice !== undefined && Number(req.body.costPrice) < 0) errors.push("costPrice must be greater than or equal to 0");
  return errors;
};

export const reserveInventoryValidation = (req: Request) => {
  const errors: string[] = [];
  if (!req.body?.variantId) errors.push("variantId is required");
  if (req.body?.quantity !== undefined && Number(req.body.quantity) < 1) errors.push("quantity must be at least 1");
  return errors;
};

export const sellInventoryValidation = (req: Request) => {
  const ids = req.body?.inventoryUnitIds || (req.body?.inventoryUnitId ? [req.body.inventoryUnitId] : []);
  const errors: string[] = [];
  if (!Array.isArray(ids) || ids.length === 0) errors.push("inventoryUnitIds is required");
  if (req.body?.soldPrice !== undefined && Number(req.body.soldPrice) < 0) errors.push("soldPrice must be greater than or equal to 0");
  return errors;
};

export const returnInventoryValidation = (req: Request) => {
  const errors: string[] = [];
  if (!req.body?.inventoryUnitId && !req.body?.serialNumber && !req.body?.imei && !req.body?.imei1) {
    errors.push("inventoryUnitId, serialNumber, or imei is required");
  }
  return errors;
};
