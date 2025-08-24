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
exports.createProduct = void 0;
const batchInsertQueue_1 = require("../../utils/batchInsertQueue");
const server_1 = require("../../server");
const notification_service_1 = require("../../services/notification.service");
const createProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { name, description, price, stock, status, category, seller, tag } = req.body;
        const userInputId = (_a = req === null || req === void 0 ? void 0 : req.user) === null || _a === void 0 ? void 0 : _a.id;
        const files = req.files;
        let imageUrls = [];
        if (files && files.length > 0) {
            imageUrls = files.map((file) => `/uploads/${file.filename}`);
        }
        (0, batchInsertQueue_1.addToBatch)({
            name,
            description,
            price,
            stock,
            status,
            category,
            seller,
            tag,
            image: imageUrls,
            userId: userInputId,
        });
        yield (0, notification_service_1.publishNotificationEvent)({
            userId: userInputId,
            title: "Created Product",
            message: `Product ${name} has been created.`,
            read: false,
        });
        server_1.io.emit("product:created", userInputId);
        res.status(200).json({ msg: "Product added to batch for creation." });
    }
    catch (err) {
        console.error("Error adding product:", err.message);
        res.status(400).json({ error: "Server error create product." });
    }
});
exports.createProduct = createProduct;
