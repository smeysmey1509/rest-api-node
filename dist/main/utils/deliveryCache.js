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
exports.normalizeMethod = void 0;
exports.loadDeliveryCache = loadDeliveryCache;
exports.getDelivery = getDelivery;
// utils/deliveryCache.ts
const DeliverySetting_1 = __importDefault(require("../../models/DeliverySetting"));
let CACHE = new Map();
let READY = false;
const normalizeMethod = (m) => String(m || "").trim().toLowerCase();
exports.normalizeMethod = normalizeMethod;
function loadDeliveryCache() {
    return __awaiter(this, void 0, void 0, function* () {
        const docs = yield DeliverySetting_1.default.find({ isActive: true }, { method: 1, baseFee: 1, taxRate: 1, freeThreshold: 1, estimatedDays: 1 }).lean();
        const next = new Map();
        for (const d of docs) {
            const key = (0, exports.normalizeMethod)(d.method);
            next.set(key, Object.assign(Object.assign({}, d), { methodKey: key }));
        }
        CACHE = next;
        READY = true;
    });
}
function getDelivery(method) {
    if (!READY)
        return undefined;
    return CACHE.get((0, exports.normalizeMethod)(method));
}
// Refresh every 30s (cheap), and whenever you mutate Delivery via your CRUD routes.
setInterval(() => { loadDeliveryCache().catch(() => { }); }, 30000);
loadDeliveryCache().catch(() => { });
