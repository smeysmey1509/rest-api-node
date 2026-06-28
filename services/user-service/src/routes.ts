import { Router } from "express";
import userRoutes from "./modules/users/user.route";

const router = Router();

router.use(userRoutes);

export default router;
