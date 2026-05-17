"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.returnInventoryValidation = exports.sellInventoryValidation = exports.reserveInventoryValidation = exports.stockInValidation = void 0;
const stockInValidation = (req) => {
    var _a, _b, _c, _d, _e;
    const errors = [];
    if (!((_a = req.body) === null || _a === void 0 ? void 0 : _a.productId))
        errors.push("productId is required");
    if (!((_b = req.body) === null || _b === void 0 ? void 0 : _b.variantId))
        errors.push("variantId is required");
    if (!((_c = req.body) === null || _c === void 0 ? void 0 : _c.locationId))
        errors.push("locationId is required");
    if (!Array.isArray((_d = req.body) === null || _d === void 0 ? void 0 : _d.units) || req.body.units.length === 0)
        errors.push("units is required");
    if (((_e = req.body) === null || _e === void 0 ? void 0 : _e.costPrice) !== undefined && Number(req.body.costPrice) < 0)
        errors.push("costPrice must be greater than or equal to 0");
    return errors;
};
exports.stockInValidation = stockInValidation;
const reserveInventoryValidation = (req) => {
    var _a, _b;
    const errors = [];
    if (!((_a = req.body) === null || _a === void 0 ? void 0 : _a.variantId))
        errors.push("variantId is required");
    if (((_b = req.body) === null || _b === void 0 ? void 0 : _b.quantity) !== undefined && Number(req.body.quantity) < 1)
        errors.push("quantity must be at least 1");
    return errors;
};
exports.reserveInventoryValidation = reserveInventoryValidation;
const sellInventoryValidation = (req) => {
    var _a, _b, _c;
    const ids = ((_a = req.body) === null || _a === void 0 ? void 0 : _a.inventoryUnitIds) || (((_b = req.body) === null || _b === void 0 ? void 0 : _b.inventoryUnitId) ? [req.body.inventoryUnitId] : []);
    const errors = [];
    if (!Array.isArray(ids) || ids.length === 0)
        errors.push("inventoryUnitIds is required");
    if (((_c = req.body) === null || _c === void 0 ? void 0 : _c.soldPrice) !== undefined && Number(req.body.soldPrice) < 0)
        errors.push("soldPrice must be greater than or equal to 0");
    return errors;
};
exports.sellInventoryValidation = sellInventoryValidation;
const returnInventoryValidation = (req) => {
    var _a, _b, _c, _d;
    const errors = [];
    if (!((_a = req.body) === null || _a === void 0 ? void 0 : _a.inventoryUnitId) && !((_b = req.body) === null || _b === void 0 ? void 0 : _b.serialNumber) && !((_c = req.body) === null || _c === void 0 ? void 0 : _c.imei) && !((_d = req.body) === null || _d === void 0 ? void 0 : _d.imei1)) {
        errors.push("inventoryUnitId, serialNumber, or imei is required");
    }
    return errors;
};
exports.returnInventoryValidation = returnInventoryValidation;
