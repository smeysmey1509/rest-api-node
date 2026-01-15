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
exports.createBrand = void 0;
const Brand_1 = __importDefault(require("../../../models/Brand"));
const Product_1 = __importDefault(require("../../../models/Product"));
const slugify = (s) => s.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
const createBrand = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { name, slug, isActive } = (_a = req.body) !== null && _a !== void 0 ? _a : {};
        const linkExisting = String((_b = req.query.linkExisting) !== null && _b !== void 0 ? _b : "0") === "1";
        // basic validation
        if (!name || typeof name !== "string" || !name.trim()) {
            res.status(400).json({ error: "name is required" });
            return;
        }
        // prepare slug (unique)
        const desiredSlug = (slug && String(slug).trim()) || slugify(name);
        if (!desiredSlug) {
            res.status(400).json({ error: "slug could not be derived from name" });
            return;
        }
        // create
        const brand = yield Brand_1.default.create({
            name: name.trim(),
            slug: desiredSlug,
            isActive: typeof isActive === "boolean" ? isActive : true,
        });
        // Optionally link existing products by legacy string brand (case-insensitive)
        if (linkExisting) {
            yield Product_1.default.updateMany({ brand: new RegExp(`^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }, { $set: { brandRef: brand._id } });
        }
        res.status(201).json(brand);
    }
    catch (err) {
        // Handle duplicate key nicely
        if ((err === null || err === void 0 ? void 0 : err.code) === 11000) {
            const field = Object.keys(err.keyPattern || {})[0] || "unique field";
            res.status(409).json({ error: `Brand ${field} already exists.` });
            return;
        }
        console.error("createBrand error:", err);
        res.status(500).json({ error: "Failed to create brand" });
    }
});
exports.createBrand = createBrand;
