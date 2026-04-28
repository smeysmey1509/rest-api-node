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
exports.wishlistController = void 0;
const wishlist_service_1 = require("./wishlist.service");
const requireUserId = (req) => { var _a; return String(((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || ""); };
exports.wishlistController = {
    get(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield wishlist_service_1.wishlistService.get(requireUserId(req), req.query);
            res.status(200).json(result);
        });
    },
    add(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield wishlist_service_1.wishlistService.add(requireUserId(req), req.params.productId || req.body.productId);
            res.status(201).json(result);
        });
    },
    remove(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield wishlist_service_1.wishlistService.remove(requireUserId(req), req.params.productId || req.body.productId);
            res.status(200).json(result);
        });
    },
    moveToCart(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield wishlist_service_1.wishlistService.moveToCart(requireUserId(req), req.body.productId, req.body.quantity);
            res.status(200).json(result);
        });
    },
};
