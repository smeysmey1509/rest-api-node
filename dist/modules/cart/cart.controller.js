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
exports.cartController = void 0;
const cart_service_1 = require("./cart.service");
const requireUserId = (req) => { var _a; return String(((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || ""); };
exports.cartController = {
    get(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const cart = yield cart_service_1.cartService.get(requireUserId(req));
            res.status(200).json(cart);
        });
    },
    add(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const cart = yield cart_service_1.cartService.add(requireUserId(req), req.body.productId, req.body.quantity);
            res.status(200).json(cart);
        });
    },
    remove(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const productId = ((_a = req.body) === null || _a === void 0 ? void 0 : _a.productId) || req.params.productId;
            const cart = yield cart_service_1.cartService.remove(requireUserId(req), productId);
            res.status(200).json(cart);
        });
    },
    updateQuantity(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const cart = yield cart_service_1.cartService.updateQuantity(requireUserId(req), req.params.productId, Number(req.body.quantity));
            res.status(200).json(cart);
        });
    },
    clear(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield cart_service_1.cartService.clear(requireUserId(req));
            res.status(200).json(result);
        });
    },
    applyPromo(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield cart_service_1.cartService.applyPromo(requireUserId(req), req.body.code);
            res.status(200).json(result);
        });
    },
    removePromo(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield cart_service_1.cartService.removePromo(requireUserId(req));
            res.status(200).json(result);
        });
    },
    selectDelivery(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield cart_service_1.cartService.selectDelivery(requireUserId(req), req.body.method);
            res.status(200).json(result);
        });
    },
};
