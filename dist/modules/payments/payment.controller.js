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
exports.paymentController = void 0;
const payment_service_1 = require("./payment.service");
exports.paymentController = {
    get(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const payment = yield payment_service_1.paymentService.getById(req.params.id);
            res.status(200).json(payment);
        });
    },
    verify(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const payment = yield payment_service_1.paymentService.verifyPayment(req.params.id);
            res.status(200).json(payment);
        });
    },
    confirmManual(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const payment = yield payment_service_1.paymentService.markManualSuccess(req.params.id);
            res.status(200).json(payment);
        });
    },
};
