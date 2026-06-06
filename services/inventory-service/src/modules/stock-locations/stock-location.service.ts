import mongoose from "mongoose";
import { AppError } from "@shared/errors/app-error";
import { stockLocationRepository } from "./stock-location.repository";

const ensureId = (id: string) => {
  if (!mongoose.isValidObjectId(id)) throw new AppError("Invalid stock location id", 400);
};

export const stockLocationService = {
  list() {
    return stockLocationRepository.list();
  },

  async get(id: string) {
    ensureId(id);
    const location = await stockLocationRepository.findById(id);
    if (!location) throw new AppError("Stock location not found", 404);
    return location;
  },

  create(payload: Record<string, unknown>) {
    return stockLocationRepository.create({
      name: payload.name,
      code: payload.code,
      type: String(payload.type || "").toUpperCase(),
      address: payload.address,
      isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
    });
  },

  async update(id: string, payload: Record<string, unknown>) {
    ensureId(id);
    const location = await stockLocationRepository.update(id, payload);
    if (!location) throw new AppError("Stock location not found", 404);
    return location;
  },

  async remove(id: string) {
    ensureId(id);
    const location = await stockLocationRepository.remove(id);
    if (!location) throw new AppError("Stock location not found", 404);
    return { msg: "Stock location deleted successfully." };
  },
};
