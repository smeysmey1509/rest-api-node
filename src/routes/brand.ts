import { Router } from "express";
import { authenticateToken } from "../../middleware/auth";
import { authorizePermission } from "../../middleware/authorizePermission";
import { createBrand } from "../controllers/brand/createBrand.controller";
import { listBrands } from "../controllers/brand/listBrands.controller";

const router = Router();

router.get("/brands", authenticateToken, authorizePermission("read"), listBrands);
router.post("/brands", authenticateToken, authorizePermission("create"), createBrand);

export default router;
