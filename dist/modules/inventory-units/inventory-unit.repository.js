"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryUnitRepository = void 0;
const mongoose_1 = require("mongoose");
const inventory_unit_model_1 = __importDefault(require("./inventory-unit.model"));
exports.inventoryUnitRepository = {
    list(filter = {}) {
        return inventory_unit_model_1.default.find(filter)
            .populate("productId", "name slug productCode productType trackingType")
            .populate("variantId", "sku optionValues pricing")
            .populate("locationId", "name code type")
            .sort({ createdAt: -1 })
            .limit(200)
            .lean();
    },
    findById(id, session) {
        const query = inventory_unit_model_1.default.findById(id);
        if (session)
            query.session(session);
        return query;
    },
    findDuplicate(serials, imeis, session) {
        const conditions = [];
        if (serials.length)
            conditions.push({ serialNumber: { $in: serials } });
        if (imeis.length)
            conditions.push({ imei1: { $in: imeis } }, { imei2: { $in: imeis } });
        if (!conditions.length)
            return Promise.resolve([]);
        const query = inventory_unit_model_1.default.find({ $or: conditions }).select("serialNumber imei1 imei2");
        if (session)
            query.session(session);
        return query.lean();
    },
    createMany(payloads, session) {
        return inventory_unit_model_1.default.insertMany(payloads, { session });
    },
    countSummary(variantId, session) {
        return __awaiter(this, void 0, void 0, function* () {
            const rows = yield inventory_unit_model_1.default.aggregate([
                { $match: { variantId: new mongoose_1.Types.ObjectId(String(variantId)) } },
                { $group: { _id: "$status", count: { $sum: 1 } } },
            ]).session(session || null);
            const byStatus = rows.reduce((acc, row) => {
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
        });
    },
    findReservable(variantId, quantity, session) {
        return inventory_unit_model_1.default.find({ variantId, status: "AVAILABLE" })
            .sort({ createdAt: 1 })
            .limit(quantity)
            .session(session || null);
    },
    findForRelease(filter, session) {
        return inventory_unit_model_1.default.find(Object.assign(Object.assign({}, filter), { status: "RESERVED" })).session(session || null);
    },
    findByLookup(lookup, session) {
        const query = inventory_unit_model_1.default.findOne(lookup);
        if (session)
            query.session(session);
        return query;
    },
};
