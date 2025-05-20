import { Request, Response, NextFunction } from "express";

export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role; // Assuming req.user is populated with the authenticated user's data

    if (!req.user || !roles.includes(userRole)) {
      return res.status(403).json({ message: "Access Denied" });
    }

    next();
  };
};
