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
const PromoUsage_1 = __importDefault(require("../../models/PromoUsage"));
const PromoCode_1 = __importDefault(require("../../models/PromoCode"));
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
router.post("/cart/apply-promo", auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { code } = req.body;
        if (!code) {
            res.status(400).json({ error: "Promo code is required." });
            return;
        }
        const promo = yield PromoCode_1.default.findOne({ code: code.toUpperCase(), isActive: true });
        if (!promo) {
            res.status(404).json({ error: "Promo code not found or inactive." });
            return;
        }
        if (promo.expiresAt < new Date()) {
            res.status(400).json({ error: "Promo code expired." });
            return;
        }
        const usage = yield PromoUsage_1.default.findOne({ user: req.user.id, promoCode: promo._id });
        if (usage && usage.usageCount >= promo.maxUsesPerUser) {
            res.status(400).json({ error: `Promo code usage limit reached (${promo.maxUsesPerUser} times).` });
            return;
        }
        res.status(200).json({ message: "Promo code applied successfully." });
        return;
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to apply promo code." });
        return;
    }
}));
exports.default = router;
