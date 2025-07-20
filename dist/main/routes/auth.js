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
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../../models/User"));
const Product_1 = __importDefault(require("../../models/Product"));
const auth_1 = require("../../middleware/auth");
const authorizePermission_1 = require("../../middleware/authorizePermission");
const Category_1 = __importDefault(require("../../models/Category"));
const router = (0, express_1.Router)();
//Protected Route
router.get("/profile", auth_1.authenticateToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.json({
            msg: "Welcome to the protected route!",
            userId: req.user,
        });
    }
    catch (err) {
        res.status(500).json({ error: "Server error" });
    }
}));
router.get("/roles", auth_1.authenticateToken, (0, auth_1.authorizeRoles)("admin"), (req, res) => {
    res.json({ msg: "Welcome Admin" });
});
//User
router.get("/users", auth_1.authenticateToken, (0, auth_1.authorizeRoles)("admin"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield User_1.default.find().select("-password");
        res.status(200).json(users);
    }
    catch (error) {
        res.status(500).json({ error: "Faild to fetch users" });
    }
}));
router.get("/users/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const user = yield User_1.default.findById(id).select("-password");
        if (!user) {
            res.status(404).json({ msg: "User not found." });
            return;
        }
        res.status(200).json(user);
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch user." });
    }
}));
router.post("/register", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, password, role } = req.body;
        const newUser = new User_1.default({
            name,
            email,
            password: password,
            role: role || "viewer",
        });
        const existingUser = yield User_1.default.findOne({ email });
        if (existingUser)
            return res.status(400).json({ msg: "User already exists" });
        yield newUser.save();
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            return res.status(500).json({ error: "JWT secret not configured" });
        }
        const token = jsonwebtoken_1.default.sign({ id: newUser._id, role: newUser.role }, jwtSecret, {
            expiresIn: "12h",
        });
        res.json({
            token,
            user: { id: newUser._id, name: newUser.name, email: newUser.email },
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
}));
router.post("/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, password } = req.body;
        const user = yield User_1.default.findOne({ name }).select("+password");
        if (!user) {
            return res.status(400).json({ msg: "User does not exist" });
        }
        const isMatch = yield user.comparePassword(password);
        if (!isMatch)
            return res.status(400).json({ msg: "Invalid credentials" });
        const jwtSecret = process.env.JWT_SECRET;
        const refreshSecret = process.env.JWT_REFRESH_SECRET;
        if (!jwtSecret || !refreshSecret) {
            return res.status(500).json({ error: "JWT secret not configured" });
        }
        //Access token(short-lived)
        const accessToken = jsonwebtoken_1.default.sign({ id: user._id, role: user.role }, jwtSecret, {
            expiresIn: "1d",
        });
        //Refresh token (long-lived)
        const refreshToken = jsonwebtoken_1.default.sign({ id: user._id, role: user.role }, refreshSecret, {
            expiresIn: "7d",
        });
        //Send refresh token as Httponly Cookie
        res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: false, sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
        //Return access token in json
        res.json({
            accessToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
}));
router.post('/logout', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: 'strict',
    });
    return res.status(200).json({
        msg: "Logged out",
    });
}));
router.post("/refresh", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const refreshToken = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.refreshToken;
    console.log("🔁 Refresh token from cookie:", refreshToken);
    if (!refreshToken) {
        return res.status(401).json({ msg: "No refresh token provided!" });
    }
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    const accessSecret = process.env.JWT_SECRET;
    if (!refreshSecret || !accessSecret) {
        return res.status(500).json({ error: "JWT secret not configured." });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(refreshToken, refreshSecret);
        const user = yield User_1.default.findById(decoded.id);
        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }
        // Issue new access token
        const newAccessToken = jsonwebtoken_1.default.sign({ id: user._id, role: user.role }, accessSecret, { expiresIn: "7d" });
        return res.json({ accessToken: newAccessToken });
    }
    catch (err) {
        console.error("Refresh token invalid or expired:", err);
        return res.status(403).json({ msg: "Invalid or expired refresh token" });
    }
}));
//Product
//Get /api/v1/products - Get Product
router.get("/products", auth_1.authenticateToken, (0, authorizePermission_1.authorizePermission)("read"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const products = yield Product_1.default.find().populate("category", "name").populate("seller", 'name email');
        res.status(200).json(products);
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch prodcts" });
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
router.post("/products", auth_1.authenticateToken, (0, authorizePermission_1.authorizePermission)("create"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, description, price, stock, category, seller } = req.body;
        const newProduct = new Product_1.default({
            name,
            description,
            price,
            stock,
            category,
            seller
        });
        const savedProduct = yield newProduct.save();
        res.status(201).json(savedProduct);
    }
    catch (err) {
        console.error("Error adding product:", err);
        res.status(500).json({ error: "Server error" });
    }
}));
//PATCH /api/v1/products/id - Edit Product partial by ID
router.patch("/products/:id", auth_1.authenticateToken, (0, authorizePermission_1.authorizePermission)("update"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updates = req.body;
        const updatedProduct = yield Product_1.default.findByIdAndUpdate(id, updates, {
            new: true,
            runValidators: true,
        });
        if (!updatedProduct) {
            res.status(404).json({ msg: "Product not found." });
            return;
        }
        res.status(200).json(updatedProduct);
    }
    catch (err) {
        res.status(500).json({ error: "Failed to update product." });
    }
}));
//DELETE /api/v1/products/delete/id - Delete Product by ID
router.delete("/product/delete/:id", auth_1.authenticateToken, (0, authorizePermission_1.authorizePermission)("delete"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const deleteProduct = yield Product_1.default.findByIdAndDelete(id);
        if (!deleteProduct) {
            res.status(404).json({ msg: "Product not found." });
            return;
        }
        res.status(200).json({ msg: "Product deleted successfully." });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete product." });
    }
}));
//Category
router.get("/category", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const categories = yield Category_1.default.find({});
        console.log("category:", categories);
        res.status(200).json(categories);
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to fetch categories', err });
    }
}));
router.post('/category', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, description } = req.body;
        const category = yield Category_1.default.create({ name, description });
        res.status(200).json(category);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
}));
router.put('/category/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const updateCategory = yield Category_1.default.findByIdAndUpdate(id, { name, description }, { new: true, runValidations: true });
        if (!updateCategory) {
            return res.status(404).json({ message: "Category not found." });
        }
        res.json(updateCategory);
    }
    catch (e) {
        res.status(500).json({ message: "Failed to update cagory.", e });
    }
}));
router.delete("/category/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const usedByProduct = yield Product_1.default.exists({ category: id });
        if (usedByProduct) {
            return res.status(400).json({
                message: "Cannot delete category because some products are still assigned to it."
            });
        }
        const deletedGategory = yield Category_1.default.findByIdAndDelete(id);
        if (!deletedGategory) {
            return res.status(404).json({
                message: "Categor not found."
            });
        }
        res.json({ message: "Category delete successfuly" });
    }
    catch (e) {
        res.status(401).json({ message: 'Failed to delete category.', e });
    }
}));
exports.default = router;
