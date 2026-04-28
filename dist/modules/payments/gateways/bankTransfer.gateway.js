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
exports.bankTransferGateway = exports.BankTransferGateway = void 0;
class BankTransferGateway {
    initiate(input) {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                provider: "BANK_TRANSFER",
                status: "PENDING",
                checkoutData: {
                    orderId: input.order._id,
                    instructions: "Upload or submit bank transfer proof for backend verification.",
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
exports.BankTransferGateway = BankTransferGateway;
exports.bankTransferGateway = new BankTransferGateway();
