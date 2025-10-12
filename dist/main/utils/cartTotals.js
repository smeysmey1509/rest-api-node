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
exports.calculateCartTotals = calculateCartTotals;
const DeliverySetting_1 = __importDefault(require("../../models/DeliverySetting"));
function calculateCartTotals(subtotal, discount, method) {
    return __awaiter(this, void 0, void 0, function* () {
        const delivery = yield DeliverySetting_1.default.findOne({ method, isActive: true });
        let deliveryFee = 0;
        if (delivery) {
            if (delivery.freeThreshold && subtotal >= delivery.freeThreshold) {
                deliveryFee = 0;
            }
            else {
                deliveryFee = delivery.baseFee;
            }
        }
        const serviceTax = subtotal * 0.1;
        const total = subtotal - discount + deliveryFee + serviceTax;
        return { serviceTax, deliveryFee, total };
    });
}
