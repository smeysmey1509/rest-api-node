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
exports.createReview = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Review_1 = __importDefault(require("../../../models/Review"));
const Product_1 = __importDefault(require("../../../models/Product"));
const rating_service_1 = require("../../services/rating.service");
const createReview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { productId, rating, title, body } = req.body;
        // get user from your auth-augmented request
        const { user } = req;
        if (!(user === null || user === void 0 ? void 0 : user.id)) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        if (!productId || !mongoose_1.default.isValidObjectId(productId)) {
            res.status(400).json({ error: "Valid productId is required" });
            return;
        }
        const r = Number(rating);
        if (!Number.isFinite(r) || r < 1 || r > 5) {
            res.status(400).json({ error: "rating must be between 1 and 5" });
            return;
        }
        const product = yield Product_1.default.findById(productId).select("_id");
        if (!product) {
            res.status(404).json({ error: "Product not found" });
            return;
        }
        const review = yield Review_1.default.create({
            product: productId,
            user: user.id,
            rating: r,
            title: typeof title === "string" ? title : undefined,
            body: typeof body === "string" ? body : undefined,
        });
        yield (0, rating_service_1.applyNewRating)(productId, r);
        const updated = yield Product_1.default.findById(productId).select("ratingAvg ratingCount");
        res.status(201).json({
            msg: "Review created",
            review,
            productRating: {
                ratingAvg: (_a = updated === null || updated === void 0 ? void 0 : updated.ratingAvg) !== null && _a !== void 0 ? _a : 0,
                ratingCount: (_b = updated === null || updated === void 0 ? void 0 : updated.ratingCount) !== null && _b !== void 0 ? _b : 0,
            },
        });
    }
    catch (err) {
        if ((err === null || err === void 0 ? void 0 : err.code) === 11000) {
            res.status(409).json({ error: "You already reviewed this product" });
            return;
        }
        console.error("createReview error:", err === null || err === void 0 ? void 0 : err.message, err === null || err === void 0 ? void 0 : err.stack);
        res.status(400).json({ error: "Failed to create review" });
    }
});
exports.createReview = createReview;
