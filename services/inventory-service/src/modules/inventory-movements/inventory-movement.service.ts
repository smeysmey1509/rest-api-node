import mongoose from "mongoose";
import { AppError } from "@shared/errors/app-error";
import { inventoryMovementRepository } from "./inventory-movement.repository";

const ensureId = (id: string, field: string) => {
  if (!mongoose.isValidObjectId(id)) throw new AppError(`Invalid ${field} id`, 400);
};

export const inventoryMovementService = {
  list(query: Record<string, unknown>) {
    const filter: Record<string, unknown> = {};
    if (query.variantId && mongoose.isValidObjectId(String(query.variantId))) filter.variantId = query.variantId;
    if (query.productId && mongoose.isValidObjectId(String(query.productId))) filter.productId = query.productId;
    if (query.type) filter.type = String(query.type).toUpperCase();
    return inventoryMovementRepository.list(filter);
  },

  byUnit(inventoryUnitId: string) {
    ensureId(inventoryUnitId, "inventoryUnit");
    return inventoryMovementRepository.byUnit(inventoryUnitId);
  },

  byVariant(variantId: string) {
    ensureId(variantId, "variant");
    return inventoryMovementRepository.byVariant(variantId);
  },
};
