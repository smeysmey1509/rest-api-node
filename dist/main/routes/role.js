"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
// Get all roles
router.get("/roles", auth_1.authenticateToken, (0, auth_1.authorizeRoles)("admin"), (req, res) => {
    res.json({ msg: "Welcome Admin" });
});
exports.default = router;
