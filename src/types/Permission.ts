// types/Permission.ts

export type Action = "create" | "read" | "update" | "delete";

export type Role = "admin" | "editor" | "user" | "viewer";

export type RolePermissions = {
  [key in Role]: Action[];
};
