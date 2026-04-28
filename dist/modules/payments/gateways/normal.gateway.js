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
exports.normalGateway = exports.NormalGateway = void 0;
class NormalGateway {
    initiate(input) {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                provider: "NORMAL_PAYMENT",
                status: "PENDING",
                checkoutData: {
                    orderId: input.order._id,
                    paymentId: input.payment._id,
                    transactionId: input.payment.transactionId,
                    message: "Payment created. Backend/admin confirmation is required before the order is marked paid.",
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
exports.NormalGateway = NormalGateway;
exports.normalGateway = new NormalGateway();
