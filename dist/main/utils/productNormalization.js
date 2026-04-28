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
Object.defineProperty(exports, "__esModule", { value: true });
exports.slugify = void 0;
exports.toNumber = toNumber;
exports.parseJSON = parseJSON;
exports.parseTags = parseTags;
exports.ensureObjectId = ensureObjectId;
exports.normalizeVariants = normalizeVariants;
exports.normalizeAttributes = normalizeAttributes;
exports.normalizeSeo = normalizeSeo;
exports.normalizeDimensions = normalizeDimensions;
exports.buildDedupeKey = buildDedupeKey;
const mongoose_1 = __importStar(require("mongoose"));
const slugify = (s) => String(s || "")
    .toLowerCase()
    .trim()
    .replace(/['\"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
exports.slugify = slugify;
function toNumber(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}
function parseJSON(v, fallback) {
    if (v == null)
        return fallback;
    if (typeof v === "object")
        return v;
    if (typeof v === "string" && v.trim().length) {
        try {
            return JSON.parse(v);
        }
        catch (_a) {
            return fallback;
        }
    }
    return fallback;
}
function parseTags(input) {
    if (Array.isArray(input))
        return [...new Set(input.map((t) => String(t).trim()).filter(Boolean))];
    if (typeof input === "string") {
        const json = parseJSON(input, []);
        if (json.length)
            return [...new Set(json.map((t) => t.trim()).filter(Boolean))];
        return [...new Set(input.split(",").map((t) => t.trim()).filter(Boolean))];
    }
    return [];
}
function ensureObjectId(id, field) {
    if (!id || !mongoose_1.default.isValidObjectId(id)) {
        throw new Error(`Invalid ${field} id`);
    }
    return new mongoose_1.Types.ObjectId(String(id));
}
function normalizeAttributes(raw) {
    const obj = parseJSON(raw, {});
    const clean = {};
    for (const [k, val] of Object.entries(obj)) {
        clean[String(k)] = String(val);
    }
    return clean;
}
function normalizeVariants(raw) {
    const arr = parseJSON(raw, []);
    const list = Array.isArray(arr) ? arr : Object.values(arr);
    return list
        .map((v) => {
        const price = toNumber(v.price, 0);
        const stock = toNumber(v.stock, 0);
        const inv = v.inventory
            ? {
                onHand: toNumber(v.inventory.onHand, stock || 0),
                reserved: toNumber(v.inventory.reserved, 0),
                safetyStock: toNumber(v.inventory.safetyStock, 0),
            }
            : { onHand: stock || 0, reserved: 0, safetyStock: 0 };
        const attrsObj = normalizeAttributes(v.attributes);
        const attrsMap = new Map(Object.entries(attrsObj));
        return {
            sku: String(v.sku || "").trim(),
            price,
            stock,
            inventory: inv,
            attributes: attrsMap,
            images: Array.isArray(v.images) ? v.images : [],
            isActive: v.isActive !== false,
        };
    })
        .filter((v) => v.sku && Number.isFinite(v.price));
}
function normalizeSeo(raw) {
    const seo = parseJSON(raw, undefined);
    if (!seo)
        return undefined;
    const keywords = Array.isArray(seo.keywords)
        ? seo.keywords.map((k) => String(k))
        : typeof seo.keywords === "string" && seo.keywords.trim()
            ? seo.keywords.split(",").map((k) => k.trim())
            : [];
    return {
        title: typeof seo.title === "string" ? seo.title : "",
        description: typeof seo.description === "string" ? seo.description : "",
        keywords,
    };
}
function normalizeDimensions(raw) {
    const dims = parseJSON(raw, undefined);
    if (!dims ||
        (!Number.isFinite(Number(dims.length)) &&
            !Number.isFinite(Number(dims.width)) &&
            !Number.isFinite(Number(dims.height)))) {
        return undefined;
    }
    return {
        length: toNumber(dims.length, 0),
        width: toNumber(dims.width, 0),
        height: toNumber(dims.height, 0),
    };
}
function buildDedupeKey(name, brandId, categoryId) {
    return [
        String(name || "").trim().toLowerCase(),
        String(brandId || "").trim().toLowerCase(),
        String(categoryId),
    ].join("|");
}
