import { Router, Request, Response } from "express";
import Role from "../../models/Role";
import {AuthenicationRequest, authenticateToken, authorizeRoles} from "../../middleware/auth";

const router = Router();

// Get all roles
router.get(
    "/roles",
    authenticateToken,
    authorizeRoles("admin"),
    (req: AuthenicationRequest, res: Response) => {
        res.json({ msg: "Welcome Admin" });
    }
);

export default router;
