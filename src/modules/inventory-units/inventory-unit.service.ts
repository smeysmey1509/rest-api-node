import mongoose, { ClientSession, Types } from "mongoose";
import Product from "../products/product.model";
import ProductVariant from "../product-variants/product-variant.model";
import StockLocation from "../stock-locations/stock-location.model";
import Supplier from "../suppliers/supplier.model";
import { publishProductActivity } from "../activity-logs/activity-log.publisher";
import { inventoryMovementRepository } from "../inventory-movements/inventory-movement.repository";
import { productVariantRepository } from "../product-variants/product-variant.repository";
import { AppError } from "../../shared/errors/app-error";
import InventoryUnit, { IInventoryUnit } from "./inventory-unit.model";
import { inventoryUnitRepository } from "./inventory-unit.repository";

const ensureObjectId = (id: unknown, field: string) => {
  if (!id || !mongoose.isValidObjectId(String(id))) throw new AppError(`Invalid ${field} id`, 400);
  return new Types.ObjectId(String(id));
};

const cleanString = (value: unknown) => {
  const str = value == null ? "" : String(value).trim();
  return str.length ? str : undefined;
};

const toNumber = (value: unknown, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const addMonths = (date: Date, months: number) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

const runInTransaction = async <T>(work: (session: ClientSession) => Promise<T>) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const result = await work(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const validateCatalog = async (
  productId: string,
  variantId: string,
  locationId?: string,
  supplierId?: string,
  session?: ClientSession
) => {
  const [product, variant, location, supplier] = await Promise.all([
    Product.findById(productId).session(session || null),
    ProductVariant.findById(variantId).session(session || null),
    locationId ? StockLocation.findById(locationId).session(session || null) : Promise.resolve(null),
    supplierId ? Supplier.findById(supplierId).session(session || null) : Promise.resolve(null),
  ]);

  if (!product) throw new AppError("Product not found", 404);
  if (!variant) throw new AppError("Product variant not found", 404);
  if (String(variant.productId) !== String(product._id)) {
    throw new AppError("Variant does not belong to product", 400);
  }
  if (locationId && !location) throw new AppError("Stock location not found", 404);
  if (supplierId && !supplier) throw new AppError("Supplier not found", 404);

  return { product, variant, location, supplier };
};

export const recalculateVariantStockSummary = async (variantId: string | Types.ObjectId, session?: ClientSession) => {
  const summary = await inventoryUnitRepository.countSummary(variantId, session);
  await productVariantRepository.updateStockSummary(variantId, summary, session);
  return summary;
};

export const inventoryUnitService = {
  list(query: Record<string, unknown>) {
    const filter: Record<string, unknown> = {};
    if (query.productId) filter.productId = ensureObjectId(query.productId, "product");
    if (query.variantId) filter.variantId = ensureObjectId(query.variantId, "variant");
    if (query.locationId) filter.locationId = ensureObjectId(query.locationId, "location");
    if (query.status) filter.status = String(query.status).toUpperCase();
    return inventoryUnitRepository.list(filter);
  },

  async get(id: string) {
    ensureObjectId(id, "inventoryUnit");
    const unit = await InventoryUnit.findById(id)
      .populate("productId", "name slug productCode productType trackingType")
      .populate("variantId", "sku optionValues pricing")
      .populate("locationId", "name code type")
      .lean();
    if (!unit) throw new AppError("Inventory unit not found", 404);
    return unit;
  },

  async stockIn(payload: Record<string, any>, userId?: string) {
    const productId = String(ensureObjectId(payload.productId, "product"));
    const variantId = String(ensureObjectId(payload.variantId, "variant"));
    const locationId = String(ensureObjectId(payload.locationId, "location"));
    const supplierId = payload.supplierId ? String(ensureObjectId(payload.supplierId, "supplier")) : undefined;
    const units = Array.isArray(payload.units) ? payload.units : [];
    if (!units.length) throw new AppError("units is required", 400);

    return runInTransaction(async (session) => {
      const { product } = await validateCatalog(productId, variantId, locationId, supplierId, session);
      const trackingType = String((product as any).trackingType || "NONE").toUpperCase();
      const productType = String((product as any).productType || "").toUpperCase();

      const serials = units.map((unit) => cleanString(unit.serialNumber)).filter(Boolean) as string[];
      const imeis = units
        .flatMap((unit) => [cleanString(unit.imei1), cleanString(unit.imei2)])
        .filter(Boolean) as string[];

      if (trackingType === "SERIAL") {
        const invalid = units.find((unit) => !cleanString(unit.serialNumber) && !cleanString(unit.imei1) && !cleanString(unit.imei2));
        if (invalid) throw new AppError("SERIAL products require serialNumber or IMEI for each unit", 400);
      }
      if (productType === "PHONE" && trackingType === "SERIAL") {
        const hasPhoneIdentifier = units.every((unit) => cleanString(unit.imei1) || cleanString(unit.imei2) || cleanString(unit.serialNumber));
        if (!hasPhoneIdentifier) throw new AppError("PHONE stock-in should include IMEI or serialNumber", 400);
      }

      const duplicatesInRequest = [...serials, ...imeis].filter((value, index, arr) => arr.indexOf(value) !== index);
      if (duplicatesInRequest.length) throw new AppError(`Duplicate serial/IMEI in request: ${duplicatesInRequest[0]}`, 400);

      const duplicates = await inventoryUnitRepository.findDuplicate(serials, imeis, session);
      if (duplicates.length) throw new AppError("serialNumber, imei1, or imei2 already exists", 409);

      const receivedAt = payload.receivedAt ? new Date(payload.receivedAt) : new Date();
      const docs = await inventoryUnitRepository.createMany(
        units.map((unit) => ({
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
            costPrice: toNumber(unit.costPrice ?? payload.costPrice, 0),
            currency: String(unit.currency || payload.currency || "USD").toUpperCase(),
            receivedAt,
          },
          warranty: unit.warrantyMonths || payload.warrantyMonths ? { warrantyMonths: toNumber(unit.warrantyMonths ?? payload.warrantyMonths, 0) } : undefined,
        })),
        session
      );

      await inventoryMovementRepository.createMany(
        docs.map((unit) => ({
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
        })),
        session
      );

      const stockSummary = await recalculateVariantStockSummary(variantId, session);
      void publishProductActivity({ action: "STOCK_IN_CREATED", productId, userId }).catch(console.error);
      return { units: docs, stockSummary };
    });
  },

  async reserve(payload: Record<string, any>, userId?: string) {
    const variantId = String(ensureObjectId(payload.variantId, "variant"));
    const quantity = Math.max(1, toNumber(payload.quantity, 1));
    const reservedBy = payload.reservedBy || userId;
    if (!reservedBy) throw new AppError("reservedBy is required", 400);
    const reservedUntil = payload.reservedUntil ? new Date(payload.reservedUntil) : new Date(Date.now() + 15 * 60 * 1000);

    return runInTransaction(async (session) => {
      const variant = await ProductVariant.findById(variantId).session(session);
      if (!variant) throw new AppError("Product variant not found", 404);
      const units = await inventoryUnitRepository.findReservable(variantId, quantity, session);
      if (units.length < quantity) throw new AppError("Not enough available inventory units", 400);

      for (const unit of units) {
        unit.status = "RESERVED";
        unit.reservedBy = ensureObjectId(reservedBy, "reservedBy");
        unit.reservedUntil = reservedUntil;
        await unit.save({ session });
      }

      await inventoryMovementRepository.createMany(
        units.map((unit) => ({
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
        })),
        session
      );

      const stockSummary = await recalculateVariantStockSummary(variantId, session);
      void publishProductActivity({ action: "INVENTORY_RESERVED", productId: String(variant.productId), userId }).catch(console.error);
      return { units, stockSummary };
    });
  },

  async release(payload: Record<string, any>, userId?: string) {
    return runInTransaction(async (session) => {
      const filter: Record<string, unknown> = {};
      if (Array.isArray(payload.inventoryUnitIds) && payload.inventoryUnitIds.length) {
        filter._id = { $in: payload.inventoryUnitIds.map((id: string) => ensureObjectId(id, "inventoryUnit")) };
      } else if (payload.variantId) {
        filter.variantId = ensureObjectId(payload.variantId, "variant");
        if (payload.expiredOnly !== false) filter.reservedUntil = { $lte: new Date() };
      } else {
        filter.reservedUntil = { $lte: new Date() };
      }

      const units = await inventoryUnitRepository.findForRelease(filter, session);
      for (const unit of units) {
        unit.status = "AVAILABLE";
        unit.reservedBy = undefined;
        unit.reservedUntil = undefined;
        await unit.save({ session });
      }

      await inventoryMovementRepository.createMany(
        units.map((unit) => ({
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
        })),
        session
      );

      const variantIds = [...new Set(units.map((unit) => String(unit.variantId)))];
      const summaries = await Promise.all(variantIds.map((id) => recalculateVariantStockSummary(id, session)));
      return { released: units.length, summaries };
    });
  },

  async sell(payload: Record<string, any>, userId?: string, session?: ClientSession) {
    const work = async (activeSession: ClientSession) => {
      const ids = Array.isArray(payload.inventoryUnitIds) ? payload.inventoryUnitIds : payload.inventoryUnitId ? [payload.inventoryUnitId] : [];
      if (!ids.length) throw new AppError("inventoryUnitIds is required", 400);
      const units = await InventoryUnit.find({ _id: { $in: ids.map((id: string) => ensureObjectId(id, "inventoryUnit")) } }).session(activeSession);
      if (units.length !== ids.length) throw new AppError("One or more inventory units were not found", 404);

      for (const unit of units) {
        if (unit.status === "SOLD") throw new AppError("Sold unit cannot be sold again", 400);
        if (["DAMAGED", "LOST", "REPAIR"].includes(unit.status)) throw new AppError("Damaged/lost/repair unit cannot be sold", 400);
        if (!["AVAILABLE", "RESERVED"].includes(unit.status)) throw new AppError(`Unit with status ${unit.status} cannot be sold`, 400);

        const soldAt = payload.soldAt ? new Date(payload.soldAt) : new Date();
        const warrantyMonths = unit.warranty?.warrantyMonths || toNumber(payload.warrantyMonths, 0);
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
          unit.warranty = {
            ...(unit.warranty || {}),
            warrantyMonths,
            warrantyStartAt: soldAt,
            warrantyEndAt: addMonths(soldAt, warrantyMonths),
          };
        }
        await unit.save({ session: activeSession });
      }

      await inventoryMovementRepository.createMany(
        units.map((unit) => ({
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
        })),
        activeSession
      );

      const variantIds = [...new Set(units.map((unit) => String(unit.variantId)))];
      const summaries = await Promise.all(variantIds.map((id) => recalculateVariantStockSummary(id, activeSession)));
      void publishProductActivity({ action: "INVENTORY_SOLD", productId: String(units[0].productId), userId }).catch(console.error);
      return { units, summaries };
    };

    return session ? work(session) : runInTransaction(work);
  },

  async returnUnit(payload: Record<string, any>, userId?: string) {
    return runInTransaction(async (session) => {
      const lookup: Record<string, unknown> = {};
      if (payload.inventoryUnitId) lookup._id = ensureObjectId(payload.inventoryUnitId, "inventoryUnit");
      else if (payload.serialNumber) lookup.serialNumber = String(payload.serialNumber);
      else if (payload.imei1 || payload.imei) lookup.imei1 = String(payload.imei1 || payload.imei);
      else throw new AppError("inventoryUnitId, serialNumber, or imei is required", 400);

      const unit = await inventoryUnitRepository.findByLookup(lookup, session);
      if (!unit) throw new AppError("Inventory unit not found", 404);
      if (unit.status !== "SOLD") throw new AppError("Only sold units can be returned", 400);
      unit.status = "RETURNED";
      await unit.save({ session });

      await inventoryMovementRepository.create(
        {
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
        },
        session
      );

      const stockSummary = await recalculateVariantStockSummary(unit.variantId, session);
      void publishProductActivity({ action: "INVENTORY_RETURNED", productId: String(unit.productId), userId }).catch(console.error);
      return { unit, stockSummary };
    });
  },

  async search(query: Record<string, unknown>) {
    const filters: Record<string, unknown>[] = [];
    if (query.serialNumber) filters.push({ serialNumber: String(query.serialNumber) });
    if (query.imei) filters.push({ $or: [{ imei1: String(query.imei) }, { imei2: String(query.imei) }] });
    if (query.imei1) filters.push({ imei1: String(query.imei1) });
    if (query.imei2) filters.push({ imei2: String(query.imei2) });

    if (query.sku) {
      const variants = await ProductVariant.find({ sku: String(query.sku).trim().toUpperCase() }).select("_id").lean();
      filters.push({ variantId: { $in: variants.map((variant) => variant._id) } });
    }

    const productName = query.productName || query.name || query.q;
    if (productName) {
      const products = await Product.find({ name: { $regex: String(productName), $options: "i" } }).select("_id").lean();
      filters.push({ productId: { $in: products.map((product) => product._id) } });
    }

    if (!filters.length) return [];
    return InventoryUnit.find({ $and: filters })
      .populate("productId", "name slug productCode productType trackingType")
      .populate("variantId", "sku optionValues pricing")
      .populate("locationId", "name code type")
      .limit(50)
      .lean();
  },
};
