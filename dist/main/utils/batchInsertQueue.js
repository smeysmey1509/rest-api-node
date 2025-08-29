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
exports.addToBatch = addToBatch;
const Product_1 = __importDefault(require("../../models/Product"));
const Category_1 = __importDefault(require("../../models/Category"));
const activity_service_1 = require("../services/activity.service");
const mongoose_1 = __importDefault(require("mongoose"));
const server_1 = require("../server");
const buffer = [];
const MAX_BATCH_SIZE = 500;
const FLUSH_INTERVAL_MS = 100;
function addToBatch(product) {
    buffer.push(product);
    if (buffer.length >= MAX_BATCH_SIZE) {
        flushBuffer();
    }
}
function flushBuffer() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (buffer.length === 0)
            return;
        // flush buffer
        const toInsert = buffer.splice(0, buffer.length);
        console.log(`Flushing ${toInsert.length} products to DB...`);
        try {
            const insertedProducts = yield Product_1.default.insertMany(toInsert, { ordered: true });
            console.log(`Inserted ${insertedProducts.length} products successfully.`);
            // ✅ Emit real-time update for each product
            for (const inserted of insertedProducts) {
                const populatedProduct = yield Product_1.default.findById(inserted._id)
                    .populate("category", "name description")
                    .populate("seller", "name email");
                if (populatedProduct) {
                    server_1.io.emit("product:created", populatedProduct);
                }
            }
            // Group by userId to log activity per user
            const activityMap = new Map();
            for (const product of toInsert) {
                const userId = (_a = product.userId) !== null && _a !== void 0 ? _a : "unknown";
                if (!activityMap.has(userId)) {
                    activityMap.set(userId, []);
                }
                activityMap.get(userId).push(product);
            }
            for (const [userId, products] of activityMap.entries()) {
                const enrichedProducts = yield Promise.all(products.map((p) => __awaiter(this, void 0, void 0, function* () {
                    const categoryDoc = yield Category_1.default.findById(p.category).select("name description");
                    return {
                        _id: new mongoose_1.default.Types.ObjectId(),
                        name: p.name,
                        description: p.description,
                        price: p.price,
                        stock: p.stock,
                        status: p.status,
                        tag: [p.tag],
                        images: p.images,
                        category: categoryDoc
                            ? {
                                _id: categoryDoc._id,
                                name: categoryDoc.name,
                                description: categoryDoc.description,
                            }
                            : null,
                    };
                })));
                yield (0, activity_service_1.publishProductActivity)({
                    user: userId,
                    action: "create",
                    products: enrichedProducts,
                });
            }
        }
        catch (err) {
            console.error("Batch insert error:", err);
        }
    });
}
setInterval(flushBuffer, FLUSH_INTERVAL_MS);
