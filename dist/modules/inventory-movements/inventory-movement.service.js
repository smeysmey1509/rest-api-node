"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryMovementService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const app_error_1 = require("../../shared/errors/app-error");
const inventory_movement_repository_1 = require("./inventory-movement.repository");
const ensureId = (id, field) => {
    if (!mongoose_1.default.isValidObjectId(id))
        throw new app_error_1.AppError(`Invalid ${field} id`, 400);
};
exports.inventoryMovementService = {
    list(query) {
        const filter = {};
        if (query.variantId && mongoose_1.default.isValidObjectId(String(query.variantId)))
            filter.variantId = query.variantId;
        if (query.productId && mongoose_1.default.isValidObjectId(String(query.productId)))
            filter.productId = query.productId;
        if (query.type)
            filter.type = String(query.type).toUpperCase();
        return inventory_movement_repository_1.inventoryMovementRepository.list(filter);
    },
    byUnit(inventoryUnitId) {
        ensureId(inventoryUnitId, "inventoryUnit");
        return inventory_movement_repository_1.inventoryMovementRepository.byUnit(inventoryUnitId);
    },
    byVariant(variantId) {
        ensureId(variantId, "variant");
        return inventory_movement_repository_1.inventoryMovementRepository.byVariant(variantId);
    },
};
