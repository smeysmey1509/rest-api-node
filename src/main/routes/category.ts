import { Router } from "express";
import { authenticateToken } from "../../middleware/auth";
import { authorizePermission } from "../../middleware/authorizePermission";

import { createCategory } from "../controllers/category/createCategory.controller";
import { listCategories } from "../controllers/category/listCategories.controller";
import { getCategoryById } from "../controllers/category/getCategoryById.controller";
import { updateCategory } from "../controllers/category/updateCategory.controller";
import { deleteCategory } from "../controllers/category/deleteCategory.controller";

const router = Router();

router.get("/categories", authenticateToken, authorizePermission("read"), listCategories);
router.get("/categories/:id", authenticateToken, authorizePermission("read"), getCategoryById);
router.post("/categories", authenticateToken, authorizePermission("create"), createCategory);
router.patch("/categories/:id", authenticateToken, authorizePermission("update"), updateCategory);
router.delete("/categories/:id", authenticateToken, authorizePermission("delete"), deleteCategory);


export default router;
