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
exports.nextProductSeq = nextProductSeq;
const Counter_1 = __importDefault(require("../models/Counter"));
function nextProductSeq(sellerId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const normalizedSellerId = String(sellerId || "").trim();
        if (!normalizedSellerId) {
            throw new Error("sellerId is required to increment product sequence");
        }
        const scope = `seller:${normalizedSellerId}:product`;
        const doc = yield Counter_1.default.findOneAndUpdate({ scope }, { $inc: { seq: 1 }, $setOnInsert: { scope, seq: 0 } }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean();
        if (!doc || !Number.isFinite(doc.seq)) {
            const fallback = yield Counter_1.default.findOneAndUpdate({ scope }, { $set: { seq: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean();
            return (_a = fallback === null || fallback === void 0 ? void 0 : fallback.seq) !== null && _a !== void 0 ? _a : 1;
        }
        return doc.seq;
    });
}
