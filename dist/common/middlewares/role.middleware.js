"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = exports.authorizeRoles = void 0;
const roles_1 = require("../constants/roles");
const authorizeRoles = (...roles) => {
    const allowed = roles.map((role) => (0, roles_1.normalizeRole)(String(role)));
    return (req, res, next) => {
        var _a;
        const userRole = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) ? (0, roles_1.normalizeRole)(req.user.role) : undefined;
        if (!userRole || !allowed.includes(userRole)) {
            res.status(403).json({ msg: "Forbidden: insufficient role" });
            return;
        }
        next();
    };
};
exports.authorizeRoles = authorizeRoles;
exports.requireAdmin = (0, exports.authorizeRoles)("ADMIN");
