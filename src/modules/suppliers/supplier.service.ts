import mongoose from "mongoose";
import { AppError } from "../../shared/errors/app-error";
import { supplierRepository } from "./supplier.repository";

const ensureId = (id: string) => {
  if (!mongoose.isValidObjectId(id)) throw new AppError("Invalid supplier id", 400);
};

export const supplierService = {
  list() {
    return supplierRepository.list();
  },

  async get(id: string) {
    ensureId(id);
    const supplier = await supplierRepository.findById(id);
    if (!supplier) throw new AppError("Supplier not found", 404);
    return supplier;
  },

  create(payload: Record<string, unknown>) {
    return supplierRepository.create({
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      address: payload.address,
      contactPerson: payload.contactPerson,
      isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
    });
  },

  async update(id: string, payload: Record<string, unknown>) {
    ensureId(id);
    const supplier = await supplierRepository.update(id, payload);
    if (!supplier) throw new AppError("Supplier not found", 404);
    return supplier;
  },

  async remove(id: string) {
    ensureId(id);
    const supplier = await supplierRepository.remove(id);
    if (!supplier) throw new AppError("Supplier not found", 404);
    return { msg: "Supplier deleted successfully." };
  },
};
