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
exports.reviewController = void 0;
const review_service_1 = require("./review.service");
exports.reviewController = {
    listApproved(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const reviews = yield review_service_1.reviewService.listApproved(req.params.productId);
            res.status(200).json({ reviews });
        });
    },
    create(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const result = yield review_service_1.reviewService.create(String(((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || ""), req.body || {});
            res.status(201).json(result);
        });
    },
    approve(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const review = yield review_service_1.reviewService.approve(req.params.id);
            res.status(200).json(review);
        });
    },
    remove(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield review_service_1.reviewService.remove(req.params.id);
            res.status(200).json(result);
        });
    },
};
