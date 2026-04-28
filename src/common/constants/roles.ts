export const Roles = {
  ADMIN: "ADMIN",
  CUSTOMER: "CUSTOMER",
  STAFF: "STAFF",
} as const;

export type RoleValue = (typeof Roles)[keyof typeof Roles];

const legacyRoleMap: Record<string, RoleValue> = {
  admin: Roles.ADMIN,
  user: Roles.CUSTOMER,
  customer: Roles.CUSTOMER,
  viewer: Roles.CUSTOMER,
  editor: Roles.STAFF,
  staff: Roles.STAFF,
  system: Roles.ADMIN,
};

export const normalizeRole = (role?: string): RoleValue => {
  if (!role) return Roles.CUSTOMER;
  const upper = role.toUpperCase();
  if (Object.values(Roles).includes(upper as RoleValue)) {
    return upper as RoleValue;
  }
  return legacyRoleMap[role.toLowerCase()] || Roles.CUSTOMER;
};
