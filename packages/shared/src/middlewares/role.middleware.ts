import { NextFunction, RequestHandler, Response } from "express";
import { normalizeRole, RoleValue } from "../constants/roles";
import { AuthenticatedRequest } from "./auth.middleware";

export const authorizeRoles = (...roles: Array<RoleValue | string>): RequestHandler => {
  const allowed = roles.map((role) => normalizeRole(String(role)));

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role ? normalizeRole(req.user.role) : undefined;

    if (!userRole || !allowed.includes(userRole)) {
      res.status(403).json({ msg: "Forbidden: insufficient role" });
      return;
    }

    next();
  };
};

export const requireAdmin = authorizeRoles("ADMIN");
