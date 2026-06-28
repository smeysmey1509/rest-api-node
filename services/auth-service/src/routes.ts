import { Router } from "express";
import authRoutes from "./modules/auth/auth.route";
import roleRoutes from "./modules/roles/role.route";

const router = Router();

router.use(authRoutes);
router.use(roleRoutes);

export default router;
