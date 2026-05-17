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
const delivery_setting_model_1 = __importDefault(require("./delivery-setting.model"));
const auth_middleware_1 = require("../../shared/middlewares/auth.middleware");
const pickup_code_1 = require("../../shared/helpers/pickup-code");
const router = (0, express_1.Router)();
router.get("/delivery", auth_middleware_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const settings = yield delivery_setting_model_1.default.find();
        res.status(200).json(settings);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch delivery methods." });
    }
}));
router.post("/delivery", auth_middleware_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { method, baseFee, freeThreshold, estimatedDays, isActive } = req.body;
        if (!method || baseFee == null || estimatedDays == null) {
            res.status(400).json({ error: "Method, baseFee, and estimatedDays are required." });
            return;
        }
        const exists = yield delivery_setting_model_1.default.findOne({ method });
        if (exists) {
            res.status(400).json({ error: "Delivery method already exists." });
            return;
        }
        const settingData = { method, baseFee, freeThreshold, estimatedDays, isActive: isActive !== null && isActive !== void 0 ? isActive : true };
        // Only for Pickup method, generate a code template
        if (method.toLowerCase() === "pickup") {
            settingData.code = (0, pickup_code_1.generatePickupCode)();
        }
        const setting = new delivery_setting_model_1.default(settingData);
        yield setting.save();
        res.status(201).json(setting);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create delivery method." });
    }
}));
router.put("/delivery/edit/:id", auth_middleware_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { method, baseFee, freeThreshold, isActive } = req.body;
        const setting = yield delivery_setting_model_1.default.findByIdAndUpdate(id, { method, baseFee, freeThreshold, isActive }, { new: true });
        if (!setting) {
            res.status(404).json({ error: "Delivery method not found." });
            return;
        }
        res.status(200).json(setting);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update delivery method." });
    }
}));
router.delete("/delivery/remove/:id", auth_middleware_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const setting = yield delivery_setting_model_1.default.findByIdAndDelete(id);
        if (!setting) {
            res.status(404).json({ error: "Delivery method not found." });
            return;
        }
        res.status(200).json({ message: "Delivery method deleted." });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete delivery method." });
    }
}));
exports.default = router;
