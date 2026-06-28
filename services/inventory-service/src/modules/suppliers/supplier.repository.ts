import Supplier from "./supplier.model";

export const supplierRepository = {
  list() {
    return Supplier.find().sort({ createdAt: -1 }).lean();
  },
  findById(id: string) {
    return Supplier.findById(id);
  },
  create(payload: Record<string, unknown>) {
    return Supplier.create(payload);
  },
  update(id: string, payload: Record<string, unknown>) {
    return Supplier.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  },
  remove(id: string) {
    return Supplier.findByIdAndUpdate(id, { isActive: false }, { new: true });
  },
};
