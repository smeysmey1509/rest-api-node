import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { authenticateToken, AuthenicationRequest, authorizeRoles } from "../middleware/auth";

const router = Router();

//Protected Route
router.get(
    "/profile",
    authenticateToken,
    async (req: AuthenicationRequest, res: Response) => {
        try {
            res.json({
                msg: "Welcome to the protected route!",
                userId: req.user,
            });
        } catch (err) {
            res.status(500).json({ error: "Server error" });
        }
    }
);

router.get(
    "/roles",
    authenticateToken,
    authorizeRoles("admin"),
    (req: AuthenicationRequest, res: Response) => {
        res.json({ msg: "Welcome Admin" });
    }
);

//User
router.get("/users",  authenticateToken,
    authorizeRoles("admin"), async (req: Request, res: Response) => {
        try {
            const users = await User.find().select("-password");
            res.status(200).json(users);
        } catch (error) {
            res.status(500).json({ error: "Faild to fetch users" });
        }
    });

router.get("/users/:id", async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id).select("-password");

        if (!user) {
            res.status(404).json({ msg: "User not found." });
            return;
        }
        res.status(200).json(user);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch user." });
    }
});

router.post("/register", async (req: Request, res: Response): Promise<any> => {
    try {
        const { name, email, password, role } = req.body;

        const newUser = new User({
            name,
            email,
            password: password,
            role: role || "viewer",
        });

        const existingUser = await User.findOne({ email });
        if (existingUser)
            return res.status(400).json({ msg: "User already exists" });

        await newUser.save();

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            return res.status(500).json({ error: "JWT secret not configured" });
        }

        const token = jwt.sign({ id: newUser._id, role: newUser.role }, jwtSecret, {
            expiresIn: "12h",
        });

        res.json({
            token,
            user: { id: newUser._id, name: newUser.name, email: newUser.email },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

router.post("/login", async (req: Request, res: Response): Promise<any> => {
    try {
        const { name, password } = req.body;

        const user = await User.findOne({ name }).select("+password");
        if (!user) {
            return res.status(400).json({ msg: "User does not exist" });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

        const jwtSecret = process.env.JWT_SECRET;
        const refreshSecret = process.env.JWT_REFRESH_SECRET;
        if (!jwtSecret || !refreshSecret) {
            return res.status(500).json({ error: "JWT secret not configured" });
        }

        //Access token(short-lived)
        const accessToken = jwt.sign({ id: user._id, role: user.role }, jwtSecret, {
            expiresIn: "1d",
        });

        //Refresh token (long-lived)
        const refreshToken = jwt.sign({ id: user._id, role: user.role }, refreshSecret, {
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
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

router.post('/logout', async (req: Request, res: Response): Promise<any> => {
    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: 'strict',
    });
    return res.status(200).json({
        msg: "Logged out",
    })
})

router.post("/refresh", async (req: Request, res: Response): Promise<any> => {
    const refreshToken = req.cookies?.refreshToken;

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
        const decoded = jwt.verify(refreshToken, refreshSecret) as jwt.JwtPayload;

        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }

        // Issue new access token
        const newAccessToken = jwt.sign(
            { id: user._id, role: user.role },
            accessSecret,
            { expiresIn: "7d" }
        );

        return res.json({ accessToken: newAccessToken });
    } catch (err) {
        console.error("Refresh token invalid or expired:", err);
        return res.status(403).json({ msg: "Invalid or expired refresh token" });
    }
});

export default router;
