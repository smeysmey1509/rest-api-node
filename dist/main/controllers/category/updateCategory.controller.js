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
exports.updateCategory = void 0;
const Category_1 = __importDefault(require("../../../models/Category"));
const updateCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updatable = [
            "categoryId",
            "categoryName",
            "description",
            "productCount",
            "totalStock",
            "avgPrice",
            "totalSales",
        ];
        const updates = {};
        for (const key of updatable) {
            if (key in req.body)
                updates[key] = req.body[key];
        }
        if (typeof updates.categoryId === "string")
            updates.categoryId = updates.categoryId.trim();
        if (typeof updates.categoryName === "string")
            updates.categoryName = updates.categoryName.trim();
        if (typeof updates.description === "string")
            updates.description = updates.description.trim();
        ["productCount", "totalStock", "avgPrice", "totalSales"].forEach((k) => {
            if (k in updates)
                updates[k] = Number(updates[k]) || 0;
        });
        const doc = yield Category_1.default.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true,
        });
        if (!doc) {
            res.status(404).json({ error: "Category not found" });
            return;
        }
        res.status(200).json({ msg: "Category updated.", category: doc });
    }
    catch (err) {
        if ((err === null || err === void 0 ? void 0 : err.code) === 11000) {
            res.status(409).json({ error: "Duplicate key", details: err.keyValue });
            return;
        }
        console.error("updateCategory error:", err);
        res.status(500).json({ error: "Failed to update category" });
    }
});
exports.updateCategory = updateCategory;
