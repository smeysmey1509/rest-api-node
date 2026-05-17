"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.inventoryUnitService = exports.recalculateVariantStockSummary = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const product_model_1 = __importDefault(require("../products/product.model"));
const product_variant_model_1 = __importDefault(require("../product-variants/product-variant.model"));
const stock_location_model_1 = __importDefault(require("../stock-locations/stock-location.model"));
const supplier_model_1 = __importDefault(require("../suppliers/supplier.model"));
const activity_log_publisher_1 = require("../activity-logs/activity-log.publisher");
const inventory_movement_repository_1 = require("../inventory-movements/inventory-movement.repository");
const product_variant_repository_1 = require("../product-variants/product-variant.repository");
const app_error_1 = require("../../shared/errors/app-error");
const inventory_unit_model_1 = __importDefault(require("./inventory-unit.model"));
const inventory_unit_repository_1 = require("./inventory-unit.repository");
const ensureObjectId = (id, field) => {
    if (!id || !mongoose_1.default.isValidObjectId(String(id)))
        throw new app_error_1.AppError(`Invalid ${field} id`, 400);
    return new mongoose_1.Types.ObjectId(String(id));
};
const cleanString = (value) => {
    const str = value == null ? "" : String(value).trim();
    return str.length ? str : undefined;
};
const toNumber = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};
const addMonths = (date, months) => {
    const next = new Date(date);
    next.setMonth(next.getMonth() + months);
    return next;
};
const runInTransaction = (work) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const result = yield work(session);
        yield session.commitTransaction();
        return result;
    }
    catch (error) {
        yield session.abortTransaction();
        throw error;
    }
    finally {
        session.endSession();
    }
});
const validateCatalog = (productId, variantId, locationId, supplierId, session) => __awaiter(void 0, void 0, void 0, function* () {
    const [product, variant, location, supplier] = yield Promise.all([
        product_model_1.default.findById(productId).session(session || null),
        product_variant_model_1.default.findById(variantId).session(session || null),
        locationId ? stock_location_model_1.default.findById(locationId).session(session || null) : Promise.resolve(null),
        supplierId ? supplier_model_1.default.findById(supplierId).session(session || null) : Promise.resolve(null),
    ]);
    if (!product)
        throw new app_error_1.AppError("Product not found", 404);
    if (!variant)
        throw new app_error_1.AppError("Product variant not found", 404);
    if (String(variant.productId) !== String(product._id)) {
        throw new app_error_1.AppError("Variant does not belong to product", 400);
    }
    if (locationId && !location)
        throw new app_error_1.AppError("Stock location not found", 404);
    if (supplierId && !supplier)
        throw new app_error_1.AppError("Supplier not found", 404);
    return { product, variant, location, supplier };
});
const recalculateVariantStockSummary = (variantId, session) => __awaiter(void 0, void 0, void 0, function* () {
    const summary = yield inventory_unit_repository_1.inventoryUnitRepository.countSummary(variantId, session);
    yield product_variant_repository_1.productVariantRepository.updateStockSummary(variantId, summary, session);
    return summary;
});
exports.recalculateVariantStockSummary = recalculateVariantStockSummary;
exports.inventoryUnitService = {
    list(query) {
        const filter = {};
        if (query.productId)
            filter.productId = ensureObjectId(query.productId, "product");
        if (query.variantId)
            filter.variantId = ensureObjectId(query.variantId, "variant");
        if (query.locationId)
            filter.locationId = ensureObjectId(query.locationId, "location");
        if (query.status)
            filter.status = String(query.status).toUpperCase();
        return inventory_unit_repository_1.inventoryUnitRepository.list(filter);
    },
    get(id) {
        return __awaiter(this, void 0, void 0, function* () {
            ensureObjectId(id, "inventoryUnit");
            const unit = yield inventory_unit_model_1.default.findById(id)
                .populate("productId", "name slug productCode productType trackingType")
                .populate("variantId", "sku optionValues pricing")
                .populate("locationId", "name code type")
                .lean();
            if (!unit)
                throw new app_error_1.AppError("Inventory unit not found", 404);
            return unit;
        });
    },
    stockIn(payload, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const productId = String(ensureObjectId(payload.productId, "product"));
            const variantId = String(ensureObjectId(payload.variantId, "variant"));
            const locationId = String(ensureObjectId(payload.locationId, "location"));
            const supplierId = payload.supplierId ? String(ensureObjectId(payload.supplierId, "supplier")) : undefined;
            const units = Array.isArray(payload.units) ? payload.units : [];
            if (!units.length)
                throw new app_error_1.AppError("units is required", 400);
            return runInTransaction((session) => __awaiter(this, void 0, void 0, function* () {
                const { product } = yield validateCatalog(productId, variantId, locationId, supplierId, session);
                const trackingType = String(product.trackingType || "NONE").toUpperCase();
                const productType = String(product.productType || "").toUpperCase();
                const serials = units.map((unit) => cleanString(unit.serialNumber)).filter(Boolean);
                const imeis = units
                    .flatMap((unit) => [cleanString(unit.imei1), cleanString(unit.imei2)])
                    .filter(Boolean);
                if (trackingType === "SERIAL") {
                    const invalid = units.find((unit) => !cleanString(unit.serialNumber) && !cleanString(unit.imei1) && !cleanString(unit.imei2));
                    if (invalid)
                        throw new app_error_1.AppError("SERIAL products require serialNumber or IMEI for each unit", 400);
                }
                if (productType === "PHONE" && trackingType === "SERIAL") {
                    const hasPhoneIdentifier = units.every((unit) => cleanString(unit.imei1) || cleanString(unit.imei2) || cleanString(unit.serialNumber));
                    if (!hasPhoneIdentifier)
                        throw new app_error_1.AppError("PHONE stock-in should include IMEI or serialNumber", 400);
                }
                const duplicatesInRequest = [...serials, ...imeis].filter((value, index, arr) => arr.indexOf(value) !== index);
                if (duplicatesInRequest.length)
                    throw new app_error_1.AppError(`Duplicate serial/IMEI in request: ${duplicatesInRequest[0]}`, 400);
                const duplicates = yield inventory_unit_repository_1.inventoryUnitRepository.findDuplicate(serials, imeis, session);
                if (duplicates.length)
                    throw new app_error_1.AppError("serialNumber, imei1, or imei2 already exists", 409);
                const receivedAt = payload.receivedAt ? new Date(payload.receivedAt) : new Date();
                const docs = yield inventory_unit_repository_1.inventoryUnitRepository.createMany(units.map((unit) => {
                    var _a, _b;
                    return ({
                        productId,
                        variantId,
                        locationId,
                        serialNumber: cleanString(unit.serialNumber),
                        imei1: cleanString(unit.imei1),
                        imei2: cleanString(unit.imei2),
                        status: "AVAILABLE",
                        condition: String(unit.condition || "NEW").toUpperCase(),
                        purchase: {
                            supplierId,
                            purchaseOrderId: payload.purchaseOrderId,
                            costPrice: toNumber((_a = unit.costPrice) !== null && _a !== void 0 ? _a : payload.costPrice, 0),
                            currency: String(unit.currency || payload.currency || "USD").toUpperCase(),
                            receivedAt,
                        },
                        warranty: unit.warrantyMonths || payload.warrantyMonths ? { warrantyMonths: toNumber((_b = unit.warrantyMonths) !== null && _b !== void 0 ? _b : payload.warrantyMonths, 0) } : undefined,
                    });
                }), session);
                yield inventory_movement_repository_1.inventoryMovementRepository.createMany(docs.map((unit) => ({
                    productId,
                    variantId,
                    inventoryUnitId: unit._id,
                    type: "STOCK_IN",
                    toLocationId: locationId,
                    quantity: 1,
                    serialNumber: unit.serialNumber,
                    imei1: unit.imei1,
                    referenceType: payload.purchaseOrderId ? "PURCHASE_ORDER" : "SYSTEM",
                    referenceId: payload.purchaseOrderId,
                    note: payload.note || "Serial stock received",
                    createdBy: userId,
                })), session);
                const stockSummary = yield (0, exports.recalculateVariantStockSummary)(variantId, session);
                void (0, activity_log_publisher_1.publishProductActivity)({ action: "STOCK_IN_CREATED", productId, userId }).catch(console.error);
                return { units: docs, stockSummary };
            }));
        });
    },
    reserve(payload, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const variantId = String(ensureObjectId(payload.variantId, "variant"));
            const quantity = Math.max(1, toNumber(payload.quantity, 1));
            const reservedBy = payload.reservedBy || userId;
            if (!reservedBy)
                throw new app_error_1.AppError("reservedBy is required", 400);
            const reservedUntil = payload.reservedUntil ? new Date(payload.reservedUntil) : new Date(Date.now() + 15 * 60 * 1000);
            return runInTransaction((session) => __awaiter(this, void 0, void 0, function* () {
                const variant = yield product_variant_model_1.default.findById(variantId).session(session);
                if (!variant)
                    throw new app_error_1.AppError("Product variant not found", 404);
                const units = yield inventory_unit_repository_1.inventoryUnitRepository.findReservable(variantId, quantity, session);
                if (units.length < quantity)
                    throw new app_error_1.AppError("Not enough available inventory units", 400);
                for (const unit of units) {
                    unit.status = "RESERVED";
                    unit.reservedBy = ensureObjectId(reservedBy, "reservedBy");
                    unit.reservedUntil = reservedUntil;
                    yield unit.save({ session });
                }
                yield inventory_movement_repository_1.inventoryMovementRepository.createMany(units.map((unit) => ({
                    productId: unit.productId,
                    variantId: unit.variantId,
                    inventoryUnitId: unit._id,
                    type: "RESERVED",
                    fromLocationId: unit.locationId,
                    quantity: 1,
                    serialNumber: unit.serialNumber,
                    imei1: unit.imei1,
                    referenceType: payload.orderId ? "ORDER" : "SYSTEM",
                    referenceId: payload.orderId || payload.cartId,
                    note: payload.note || "Inventory reserved",
                    createdBy: userId,
                })), session);
                const stockSummary = yield (0, exports.recalculateVariantStockSummary)(variantId, session);
                void (0, activity_log_publisher_1.publishProductActivity)({ action: "INVENTORY_RESERVED", productId: String(variant.productId), userId }).catch(console.error);
                return { units, stockSummary };
            }));
        });
    },
    release(payload, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return runInTransaction((session) => __awaiter(this, void 0, void 0, function* () {
                const filter = {};
                if (Array.isArray(payload.inventoryUnitIds) && payload.inventoryUnitIds.length) {
                    filter._id = { $in: payload.inventoryUnitIds.map((id) => ensureObjectId(id, "inventoryUnit")) };
                }
                else if (payload.variantId) {
                    filter.variantId = ensureObjectId(payload.variantId, "variant");
                    if (payload.expiredOnly !== false)
                        filter.reservedUntil = { $lte: new Date() };
                }
                else {
                    filter.reservedUntil = { $lte: new Date() };
                }
                const units = yield inventory_unit_repository_1.inventoryUnitRepository.findForRelease(filter, session);
                for (const unit of units) {
                    unit.status = "AVAILABLE";
                    unit.reservedBy = undefined;
                    unit.reservedUntil = undefined;
                    yield unit.save({ session });
                }
                yield inventory_movement_repository_1.inventoryMovementRepository.createMany(units.map((unit) => ({
                    productId: unit.productId,
                    variantId: unit.variantId,
                    inventoryUnitId: unit._id,
                    type: "RESERVATION_RELEASED",
                    toLocationId: unit.locationId,
                    quantity: 1,
                    serialNumber: unit.serialNumber,
                    imei1: unit.imei1,
                    referenceType: payload.orderId ? "ORDER" : "SYSTEM",
                    referenceId: payload.orderId,
                    note: payload.note || "Reservation released",
                    createdBy: userId,
                })), session);
                const variantIds = [...new Set(units.map((unit) => String(unit.variantId)))];
                const summaries = yield Promise.all(variantIds.map((id) => (0, exports.recalculateVariantStockSummary)(id, session)));
                return { released: units.length, summaries };
            }));
        });
    },
    sell(payload, userId, session) {
        return __awaiter(this, void 0, void 0, function* () {
            const work = (activeSession) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                const ids = Array.isArray(payload.inventoryUnitIds) ? payload.inventoryUnitIds : payload.inventoryUnitId ? [payload.inventoryUnitId] : [];
                if (!ids.length)
                    throw new app_error_1.AppError("inventoryUnitIds is required", 400);
                const units = yield inventory_unit_model_1.default.find({ _id: { $in: ids.map((id) => ensureObjectId(id, "inventoryUnit")) } }).session(activeSession);
                if (units.length !== ids.length)
                    throw new app_error_1.AppError("One or more inventory units were not found", 404);
                for (const unit of units) {
                    if (unit.status === "SOLD")
                        throw new app_error_1.AppError("Sold unit cannot be sold again", 400);
                    if (["DAMAGED", "LOST", "REPAIR"].includes(unit.status))
                        throw new app_error_1.AppError("Damaged/lost/repair unit cannot be sold", 400);
                    if (!["AVAILABLE", "RESERVED"].includes(unit.status))
                        throw new app_error_1.AppError(`Unit with status ${unit.status} cannot be sold`, 400);
                    const soldAt = payload.soldAt ? new Date(payload.soldAt) : new Date();
                    const warrantyMonths = ((_a = unit.warranty) === null || _a === void 0 ? void 0 : _a.warrantyMonths) || toNumber(payload.warrantyMonths, 0);
                    unit.status = "SOLD";
                    unit.reservedBy = undefined;
                    unit.reservedUntil = undefined;
                    unit.sold = {
                        orderId: payload.orderId,
                        orderItemId: payload.orderItemId,
                        soldAt,
                        soldPrice: payload.soldPrice == null ? undefined : toNumber(payload.soldPrice),
                    };
                    if (warrantyMonths > 0) {
                        unit.warranty = Object.assign(Object.assign({}, (unit.warranty || {})), { warrantyMonths, warrantyStartAt: soldAt, warrantyEndAt: addMonths(soldAt, warrantyMonths) });
                    }
                    yield unit.save({ session: activeSession });
                }
                yield inventory_movement_repository_1.inventoryMovementRepository.createMany(units.map((unit) => ({
                    productId: unit.productId,
                    variantId: unit.variantId,
                    inventoryUnitId: unit._id,
                    type: "SOLD",
                    fromLocationId: unit.locationId,
                    quantity: 1,
                    serialNumber: unit.serialNumber,
                    imei1: unit.imei1,
                    referenceType: payload.orderId ? "ORDER" : "SYSTEM",
                    referenceId: payload.orderId,
                    note: payload.note || "Inventory sold",
                    createdBy: userId,
                })), activeSession);
                const variantIds = [...new Set(units.map((unit) => String(unit.variantId)))];
                const summaries = yield Promise.all(variantIds.map((id) => (0, exports.recalculateVariantStockSummary)(id, activeSession)));
                void (0, activity_log_publisher_1.publishProductActivity)({ action: "INVENTORY_SOLD", productId: String(units[0].productId), userId }).catch(console.error);
                return { units, summaries };
            });
            return session ? work(session) : runInTransaction(work);
        });
    },
    returnUnit(payload, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return runInTransaction((session) => __awaiter(this, void 0, void 0, function* () {
                const lookup = {};
                if (payload.inventoryUnitId)
                    lookup._id = ensureObjectId(payload.inventoryUnitId, "inventoryUnit");
                else if (payload.serialNumber)
                    lookup.serialNumber = String(payload.serialNumber);
                else if (payload.imei1 || payload.imei)
                    lookup.imei1 = String(payload.imei1 || payload.imei);
                else
                    throw new app_error_1.AppError("inventoryUnitId, serialNumber, or imei is required", 400);
                const unit = yield inventory_unit_repository_1.inventoryUnitRepository.findByLookup(lookup, session);
                if (!unit)
                    throw new app_error_1.AppError("Inventory unit not found", 404);
                if (unit.status !== "SOLD")
                    throw new app_error_1.AppError("Only sold units can be returned", 400);
                unit.status = "RETURNED";
                yield unit.save({ session });
                yield inventory_movement_repository_1.inventoryMovementRepository.create({
                    productId: unit.productId,
                    variantId: unit.variantId,
                    inventoryUnitId: unit._id,
                    type: "RETURNED",
                    toLocationId: unit.locationId,
                    quantity: 1,
                    serialNumber: unit.serialNumber,
                    imei1: unit.imei1,
                    referenceType: payload.returnId ? "RETURN" : "SYSTEM",
                    referenceId: payload.returnId || payload.orderId,
                    note: payload.note || "Inventory returned",
                    createdBy: userId,
                }, session);
                const stockSummary = yield (0, exports.recalculateVariantStockSummary)(unit.variantId, session);
                void (0, activity_log_publisher_1.publishProductActivity)({ action: "INVENTORY_RETURNED", productId: String(unit.productId), userId }).catch(console.error);
                return { unit, stockSummary };
            }));
        });
    },
    search(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const filters = [];
            if (query.serialNumber)
                filters.push({ serialNumber: String(query.serialNumber) });
            if (query.imei)
                filters.push({ $or: [{ imei1: String(query.imei) }, { imei2: String(query.imei) }] });
            if (query.imei1)
                filters.push({ imei1: String(query.imei1) });
            if (query.imei2)
                filters.push({ imei2: String(query.imei2) });
            if (query.sku) {
                const variants = yield product_variant_model_1.default.find({ sku: String(query.sku).trim().toUpperCase() }).select("_id").lean();
                filters.push({ variantId: { $in: variants.map((variant) => variant._id) } });
            }
            const productName = query.productName || query.name || query.q;
            if (productName) {
                const products = yield product_model_1.default.find({ name: { $regex: String(productName), $options: "i" } }).select("_id").lean();
                filters.push({ productId: { $in: products.map((product) => product._id) } });
            }
            if (!filters.length)
                return [];
            return inventory_unit_model_1.default.find({ $and: filters })
                .populate("productId", "name slug productCode productType trackingType")
                .populate("variantId", "sku optionValues pricing")
                .populate("locationId", "name code type")
                .limit(50)
                .lean();
        });
    },
};
