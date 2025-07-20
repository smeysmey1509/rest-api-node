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
const Category_1 = __importDefault(require("../../models/Category"));
const Product_1 = __importDefault(require("../../models/Product"));
const router = (0, express_1.Router)();
router.get("/category", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const categories = yield Category_1.default.find({});
        res.status(200).json(categories);
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to fetch categories', err });
    }
}));
router.post('/category', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, description } = req.body;
        const category = yield Category_1.default.create({ name, description });
        res.status(200).json(category);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
}));
router.put('/category/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const updateCategory = yield Category_1.default.findByIdAndUpdate(id, { name, description }, { new: true, runValidations: true });
        if (!updateCategory) {
            return res.status(404).json({ message: "Category not found." });
        }
        res.json(updateCategory);
    }
    catch (e) {
        res.status(500).json({ message: "Failed to update cagory.", e });
    }
}));
router.delete("/category/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const usedByProduct = yield Product_1.default.exists({ category: id });
        if (usedByProduct) {
            return res.status(400).json({
                message: "Cannot delete category because some products are still assigned to it."
            });
        }
        const deletedGategory = yield Category_1.default.findByIdAndDelete(id);
        if (!deletedGategory) {
            return res.status(404).json({
                message: "Categor not found."
            });
        }
        res.json({ message: "Category delete successfuly" });
    }
    catch (e) {
        res.status(401).json({ message: 'Failed to delete category.', e });
    }
}));
exports.default = router;
