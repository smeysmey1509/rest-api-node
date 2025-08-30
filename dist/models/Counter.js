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
Object.defineProperty(exports, "__esModule", { value: true });
exports.nextSeqForSeller = nextSeqForSeller;
// models/Counter.ts
const mongoose_1 = require("mongoose");
const CounterSchema = new mongoose_1.Schema({ scope: { type: String, unique: true }, seq: { type: Number, default: 0 } });
const Counter = (0, mongoose_1.model)("Counter", CounterSchema);
exports.default = Counter;
// helper
function nextSeqForSeller(sellerId) {
    return __awaiter(this, void 0, void 0, function* () {
        const doc = yield Counter.findOneAndUpdate({ scope: `seller:${sellerId}:product` }, { $inc: { seq: 1 } }, { upsert: true, new: true });
        return doc.seq;
    });
}
