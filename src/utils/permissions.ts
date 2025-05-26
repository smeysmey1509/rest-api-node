export const rolePermissions: Record<string, string[]> = {
  admin: ["create", "read", "update", "delete"],
  editor: ["create", "read", "update"],
  user: ["read"],
  viewer: ["read"],
};
