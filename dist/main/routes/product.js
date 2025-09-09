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
const express_1 = require("express");
const Product_1 = __importDefault(require("../../models/Product"));
const User_1 = __importDefault(require("../../models/User"));
const auth_1 = require("../../middleware/auth");
const authorizePermission_1 = require("../../middleware/authorizePermission");
const searchProduct_controller_1 = require("../controllers/product/searchProduct.controller");
const deleteProductById_controller_1 = require("../controllers/product/deleteProductById.controller");
const createProduct_controller_1 = require("../controllers/product/createProduct.controller");
const multiDeleteProduct_controller_1 = require("../controllers/product/multiDeleteProduct.controller");
const editProduct_controller_1 = require("../controllers/product/editProduct.controller");
const upload_1 = require("../../middleware/upload");
const listProducts_controller_1 = require("../controllers/product/listProducts.controller");
const router = (0, express_1.Router)();
//Get /api/v1/products - Get All Product
router.get("/product", auth_1.authenticateToken, (0, authorizePermission_1.authorizePermission)("read"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const products = yield Product_1.default.find()
            .populate("brand", "name slug isActive")
            .populate("category", "categoryId categoryName productCount")
            .populate("seller", "name email")
            .sort({ createdAt: -1 });
        res.status(200).json(products);
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch products." });
    }
}));
//Filter Product
router.get("/products", auth_1.authenticateToken, (0, authorizePermission_1.authorizePermission)("read"), listProducts_controller_1.listProducts);
// GET /api/v1/product?limit=25&page=1
router.get("/products", auth_1.authenticateToken, (0, authorizePermission_1.authorizePermission)("read"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const user = yield User_1.default.findById(userId);
        const defaultLimit = (user === null || user === void 0 ? void 0 : user.limit) || 25;
        const limit = Math.max(parseInt(req.query.limit) || defaultLimit, 1);
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const skip = (page - 1) * limit;
        const [products, total] = yield Promise.all([
            Product_1.default.find()
                .populate("category", "name")
                .populate("seller", "name email")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Product_1.default.countDocuments(),
        ]);
        res.status(200).json({
            products,
            total,
            page,
            perPage: limit,
            totalPages: Math.ceil(total / limit),
        });
    }
    catch (err) {
        console.error("Error fetching paginated products:", err);
        res.status(500).json({ error: "Failed to fetch products." });
    }
}));
//Product by ID
router.get("/product/:id", auth_1.authenticateToken, (0, authorizePermission_1.authorizePermission)("read"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const product = yield Product_1.default.findById(id);
        if (!product) {
            res.status(404).json({ msg: "Product not found" });
            return;
        }
        res.status(200).json(product);
    }
    catch (err) {
        console.log(err);
        res.status(500).json({ error: "Failed to fetch product." });
    }
}));
//POST /api/v1/products - Create new product
router.post("/product", upload_1.upload.array("images"), auth_1.authenticateToken, (0, authorizePermission_1.authorizePermission)("create"), createProduct_controller_1.createProduct);
//PATCH /api/v1/products/id - Edit Product partial by ID
router.patch("/product/:id", auth_1.authenticateToken, (0, authorizePermission_1.authorizePermission)("update"), editProduct_controller_1.editProduct);
// DELETE /api/v1/products/delete/:id - Delete Product by ID
router.delete("/product/delete/:id", auth_1.authenticateToken, (0, authorizePermission_1.authorizePermission)("delete"), deleteProductById_controller_1.deleteProductById);
//Multi Delete /api/v1/products/delete - Multi Delete Product by ID
router.post("/product/delete", auth_1.authenticateToken, (0, authorizePermission_1.authorizePermission)("delete"), multiDeleteProduct_controller_1.multiDeleteProductController);
router.get("/products/search", auth_1.authenticateToken, searchProduct_controller_1.searchProducts);
exports.default = router;
