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
exports.applyNewRating = applyNewRating;
// src/main/services/rating.service.ts
const Product_1 = __importDefault(require("../../models/Product"));
function applyNewRating(productId, value) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        // Read current snapshot
        const p = yield Product_1.default.findById(productId).select("ratingAvg ratingCount").lean();
        if (!p)
            throw new Error("Product not found");
        const count = (_a = p.ratingCount) !== null && _a !== void 0 ? _a : 0;
        const avg = (_b = p.ratingAvg) !== null && _b !== void 0 ? _b : 0;
        const newCount = count + 1;
        const newAvg = ((avg * count) + value) / newCount;
        yield Product_1.default.updateOne({ _id: productId }, { $set: { ratingAvg: Number(newAvg.toFixed(2)) }, $inc: { ratingCount: 1 } });
    });
}
