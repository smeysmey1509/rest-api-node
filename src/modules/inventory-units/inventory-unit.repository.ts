import { ClientSession, FilterQuery, Types } from "mongoose";
import InventoryUnit, { IInventoryUnit } from "./inventory-unit.model";

export const inventoryUnitRepository = {
  list(filter: FilterQuery<IInventoryUnit> = {}) {
    return InventoryUnit.find(filter)
      .populate("productId", "name slug productCode productType trackingType")
      .populate("variantId", "sku optionValues pricing")
      .populate("locationId", "name code type")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
  },

  findById(id: string, session?: ClientSession | null) {
    const query = InventoryUnit.findById(id);
    if (session) query.session(session);
    return query;
  },

  findDuplicate(serials: string[], imeis: string[], session?: ClientSession | null) {
    const conditions: Record<string, unknown>[] = [];
    if (serials.length) conditions.push({ serialNumber: { $in: serials } });
    if (imeis.length) conditions.push({ imei1: { $in: imeis } }, { imei2: { $in: imeis } });
    if (!conditions.length) return Promise.resolve([]);
    const query = InventoryUnit.find({ $or: conditions }).select("serialNumber imei1 imei2");
    if (session) query.session(session);
    return query.lean();
  },

  createMany(payloads: Record<string, unknown>[], session?: ClientSession) {
    return InventoryUnit.insertMany(payloads, { session });
  },

  async countSummary(variantId: string | Types.ObjectId, session?: ClientSession) {
    const rows = await InventoryUnit.aggregate([
      { $match: { variantId: new Types.ObjectId(String(variantId)) } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]).session(session || null);

    const byStatus = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row._id] = row.count;
      return acc;
    }, {});

    const available = byStatus.AVAILABLE || 0;
    const reserved = byStatus.RESERVED || 0;
    const sold = byStatus.SOLD || 0;
    return {
      onHand: available + reserved + (byStatus.RETURNED || 0) + (byStatus.DAMAGED || 0) + (byStatus.REPAIR || 0),
      available,
      reserved,
      sold,
    };
  },

  findReservable(variantId: string, quantity: number, session?: ClientSession) {
    return InventoryUnit.find({ variantId, status: "AVAILABLE" })
      .sort({ createdAt: 1 })
      .limit(quantity)
      .session(session || null);
  },

  findForRelease(filter: FilterQuery<IInventoryUnit>, session?: ClientSession) {
    return InventoryUnit.find({ ...filter, status: "RESERVED" }).session(session || null);
  },

  findByLookup(lookup: Record<string, unknown>, session?: ClientSession) {
    const query = InventoryUnit.findOne(lookup);
    if (session) query.session(session);
    return query;
  },
};
