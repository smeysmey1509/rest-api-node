export const rolePermissions: Record<string, string[]> = {
  admin: ["create", "read", "update", "delete"],
  staff: ["create", "read", "update"],
  customer: ["read"],
  editor: ["create", "read", "update"],
  user: ["read"],
  viewer: ["read"],
};
