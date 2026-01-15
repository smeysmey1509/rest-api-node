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
const express_1 = require("express");
const PromoCode_1 = __importDefault(require("../../models/PromoCode"));
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
// Example middleware to check admin role (adjust as needed)
const checkAdmin = (req, res, next) => {
    var _a;
    if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== "admin") {
        res.status(403).json({ error: "Access denied, admin only." });
        return;
    }
    next();
};
router.get("/promocode", auth_1.authenticateToken, checkAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const promos = yield PromoCode_1.default.find().sort({ expiresAt: 1 }); // sort by expiration date ascending
        res.status(200).json(promos);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch promo codes." });
    }
}));
router.post("/promocode/create", auth_1.authenticateToken, checkAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { code, discountType, discountValue, expiresAt, maxUsesPerUser } = req.body;
        if (!code || !discountType || !discountValue || !expiresAt) {
            res.status(400).json({ error: "All fields are required." });
            return;
        }
        if (!["percentage", "fixed"].includes(discountType)) {
            res.status(400).json({ error: "Invalid discountType." });
            return;
        }
        if (maxUsesPerUser !== undefined && (typeof maxUsesPerUser !== "number" || maxUsesPerUser < 1)) {
            res.status(400).json({ error: "maxUsesPerUser must be a positive number." });
            return;
        }
        const existing = yield PromoCode_1.default.findOne({ code: code.toUpperCase() });
        if (existing) {
            res.status(409).json({ error: "Promo code already exists." });
            return;
        }
        const promo = new PromoCode_1.default({
            code: code.toUpperCase(),
            discountType,
            discountValue,
            expiresAt: new Date(expiresAt),
            isActive: true,
            maxUsesPerUser: maxUsesPerUser !== null && maxUsesPerUser !== void 0 ? maxUsesPerUser : 1,
        });
        yield promo.save();
        res.status(201).json({ message: "Promo code created.", promo });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create promo code." });
    }
}));
exports.default = router;
