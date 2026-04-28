"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rolePermissions = void 0;
exports.rolePermissions = {
    admin: ["create", "read", "update", "delete"],
    staff: ["create", "read", "update"],
    customer: ["read"],
    editor: ["create", "read", "update"],
    user: ["read"],
    viewer: ["read"],
};
