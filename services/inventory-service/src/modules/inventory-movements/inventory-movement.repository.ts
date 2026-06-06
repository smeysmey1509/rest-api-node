import { ClientSession } from "mongoose";
import InventoryMovement from "./inventory-movement.model";

export const inventoryMovementRepository = {
  list(filter: Record<string, unknown> = {}) {
    return InventoryMovement.find(filter).sort({ createdAt: -1 }).limit(200).lean();
  },

  byUnit(inventoryUnitId: string) {
    return InventoryMovement.find({ inventoryUnitId }).sort({ createdAt: -1 }).lean();
  },

  byVariant(variantId: string) {
    return InventoryMovement.find({ variantId }).sort({ createdAt: -1 }).lean();
  },

  create(payload: Record<string, unknown>, session?: ClientSession) {
    return InventoryMovement.create([payload], { session }).then((docs) => docs[0]);
  },

  createMany(payloads: Record<string, unknown>[], session?: ClientSession) {
    return InventoryMovement.insertMany(payloads, { session });
  },
};
