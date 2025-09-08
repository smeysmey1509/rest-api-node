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
exports.createCategory = void 0;
const Category_1 = __importDefault(require("../../../models/Category"));
const createCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { categoryId, categoryName, description = "", productCount = 0, totalStock = 0, avgPrice = 0, totalSales = 0, } = req.body || {};
        if (!categoryId || !categoryName) {
            res.status(400).json({ error: "categoryId and categoryName are required" });
            return;
        }
        const doc = yield Category_1.default.create({
            categoryId: String(categoryId).trim(),
            categoryName: String(categoryName).trim(),
            description: String(description),
            productCount: Number(productCount) || 0,
            totalStock: Number(totalStock) || 0,
            avgPrice: Number(avgPrice) || 0,
            totalSales: Number(totalSales) || 0,
        });
        res.status(201).json({ msg: "Category created.", category: doc });
    }
    catch (err) {
        if ((err === null || err === void 0 ? void 0 : err.code) === 11000) {
            res.status(409).json({ error: "Duplicate key", details: err.keyValue });
            return;
        }
        console.error("createCategory error:", err);
        res.status(500).json({ error: "Failed to create category" });
    }
});
exports.createCategory = createCategory;
