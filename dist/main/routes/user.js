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
const auth_1 = require("../../middleware/auth");
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
exports.default = router;
