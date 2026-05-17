"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryMovementRepository = void 0;
const inventory_movement_model_1 = __importDefault(require("./inventory-movement.model"));
exports.inventoryMovementRepository = {
    list(filter = {}) {
        return inventory_movement_model_1.default.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    },
    byUnit(inventoryUnitId) {
        return inventory_movement_model_1.default.find({ inventoryUnitId }).sort({ createdAt: -1 }).lean();
    },
    byVariant(variantId) {
        return inventory_movement_model_1.default.find({ variantId }).sort({ createdAt: -1 }).lean();
    },
    create(payload, session) {
        return inventory_movement_model_1.default.create([payload], { session }).then((docs) => docs[0]);
    },
    createMany(payloads, session) {
        return inventory_movement_model_1.default.insertMany(payloads, { session });
    },
};
