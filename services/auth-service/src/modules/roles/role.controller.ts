import { Request, Response } from "express";
import { roleService } from "./role.service";

export const roleController = {
  async list(_req: Request, res: Response) {
    const roles = await roleService.listRoles();
    res.status(200).json(roles);
  },
};
