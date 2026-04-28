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
exports.cashOnDeliveryGateway = exports.CashOnDeliveryGateway = void 0;
class CashOnDeliveryGateway {
    initiate(input) {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                provider: "CASH_ON_DELIVERY",
                status: "PENDING",
                checkoutData: {
                    orderId: input.order._id,
                    message: "Payment will be collected and confirmed by backend staff.",
                },
            };
        });
    }
    verify() {
        return __awaiter(this, void 0, void 0, function* () {
            return { success: false, status: "PENDING" };
        });
    }
}
exports.CashOnDeliveryGateway = CashOnDeliveryGateway;
exports.cashOnDeliveryGateway = new CashOnDeliveryGateway();
