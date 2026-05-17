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
exports.productVariantController = void 0;
const product_variant_service_1 = require("./product-variant.service");
exports.productVariantController = {
    listByProduct(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const variants = yield product_variant_service_1.productVariantService.listByProduct(req.params.productId);
            res.status(200).json({ variants });
        });
    },
    create(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const variant = yield product_variant_service_1.productVariantService.create(req.params.productId, req.body || {});
            res.status(201).json(variant);
        });
    },
    update(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const variant = yield product_variant_service_1.productVariantService.update(req.params.variantId, req.body || {});
            res.status(200).json(variant);
        });
    },
    remove(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield product_variant_service_1.productVariantService.remove(req.params.variantId);
            res.status(200).json(result);
        });
    },
};
