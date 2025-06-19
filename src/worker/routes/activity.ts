import Activity from "../../models/Activity";
import { authenticateToken } from "../../middleware/auth";
import { Router, Response } from "express";
import '../../models/User'
import { AuthenicationRequest } from "../../middleware/auth";
import dotenv from "dotenv";

dotenv.config();

const router = Router();

router.get(
    "/activities",
    authenticateToken,
    async (req: AuthenicationRequest, res: Response) => {
        try {
            const activities = await Activity.find()
                .populate('user', 'name email createdAt')
                .sort({ timestamp: -1 });

            res.status(200).json({ activities });
        } catch (error) {
            console.error("Error fetching activity:", error);
            res.status(500).json({ error: "Failed to fetch user activity." });
        }
    }
);

export default router;
