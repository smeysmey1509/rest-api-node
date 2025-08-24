"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rolePermissions = void 0;
exports.rolePermissions = {
    admin: ["create", "read", "update", "delete"],
    editor: ["create", "read", "update"],
    user: ["read"],
    viewer: ["read"],
};
