"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeRole = exports.Roles = void 0;
exports.Roles = {
    ADMIN: "ADMIN",
    CUSTOMER: "CUSTOMER",
    STAFF: "STAFF",
};
const legacyRoleMap = {
    admin: exports.Roles.ADMIN,
    user: exports.Roles.CUSTOMER,
    customer: exports.Roles.CUSTOMER,
    viewer: exports.Roles.CUSTOMER,
    editor: exports.Roles.STAFF,
    staff: exports.Roles.STAFF,
    system: exports.Roles.ADMIN,
};
const normalizeRole = (role) => {
    if (!role)
        return exports.Roles.CUSTOMER;
    const upper = role.toUpperCase();
    if (Object.values(exports.Roles).includes(upper)) {
        return upper;
    }
    return legacyRoleMap[role.toLowerCase()] || exports.Roles.CUSTOMER;
};
exports.normalizeRole = normalizeRole;
