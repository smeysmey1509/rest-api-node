import StockLocation from "./stock-location.model";

export const stockLocationRepository = {
  list() {
    return StockLocation.find().sort({ createdAt: -1 }).lean();
  },
  findById(id: string) {
    return StockLocation.findById(id);
  },
  create(payload: Record<string, unknown>) {
    return StockLocation.create(payload);
  },
  update(id: string, payload: Record<string, unknown>) {
    return StockLocation.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  },
  remove(id: string) {
    return StockLocation.findByIdAndUpdate(id, { isActive: false }, { new: true });
  },
};
