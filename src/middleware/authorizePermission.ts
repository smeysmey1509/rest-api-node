// middleware/authorizePermission.ts
import { Request, Response, NextFunction } from "express";
import { rolePermissions } from "../main/utils/permissions";
import { AuthenicationRequest } from "./auth";

export const authorizePermission = (action: string) => {
  return (
    req: AuthenicationRequest,
    res: Response,
    next: NextFunction
  ): void => {
    const role = req.user?.role;

    if (!role) {
      res.status(403).json({ msg: "Access denied. No role found." });
      return;
    }

    const permissions = rolePermissions[role.toLowerCase()];
    if (!permissions || !permissions.includes(action)) {
      res
        .status(403)
        .json({ msg: `Insufficient permissions to ${action} product.` });
      return;
    }

    next();
  };
};
