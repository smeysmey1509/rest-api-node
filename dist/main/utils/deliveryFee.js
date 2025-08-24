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
exports.calculateDeliveryFee = calculateDeliveryFee;
const DeliverySetting_1 = __importDefault(require("../../models/DeliverySetting"));
function calculateDeliveryFee(subtotal_1) {
    return __awaiter(this, arguments, void 0, function* (subtotal, method = "standard") {
        const setting = yield DeliverySetting_1.default.findOne({ method, isActive: true });
        if (!setting)
            return 0;
        if (setting.freeThreshold && subtotal >= setting.freeThreshold) {
            return 0;
        }
        return setting.baseFee;
    });
}
