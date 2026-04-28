import { Roles } from "../../common/constants/roles";
import { roleRepository } from "./role.repository";

export const roleService = {
  async listRoles() {
    const stored = await roleRepository.listStoredRoles();
    return {
      roles: Object.values(Roles),
      stored,
    };
  },
};
