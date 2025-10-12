"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizePermission = void 0;
const permissions_1 = require("../main/utils/permissions");
const authorizePermission = (action) => {
    return (req, res, next) => {
        var _a;
        const role = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role;
        if (!role) {
            res.status(403).json({ msg: "Access denied. No role found." });
            return;
        }
        const permissions = permissions_1.rolePermissions[role.toLowerCase()];
        if (!permissions || !permissions.includes(action)) {
            res
                .status(403)
                .json({ msg: `Insufficient permissions to ${action} product.` });
            return;
        }
        next();
    };
};
exports.authorizePermission = authorizePermission;
