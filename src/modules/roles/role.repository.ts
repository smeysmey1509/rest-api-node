import Role from "./role.model";

export const roleRepository = {
  listStoredRoles() {
    return Role.find().lean();
  },
};
