import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";

interface JwtPayload {
  id: string;
  role: string;
}

declare global {
  namespace Express { interface Request { user?: JwtPayload } }
}

export interface AuthenicationRequest extends Request {
  user?: JwtPayload;
  file?: Express.Multer.File;
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
}

export const authenticateToken: RequestHandler = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) return res.status(500).json({ error: "Server misconfiguration" });

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = user as JwtPayload;
    next();
  });
};

// Role checker
export const authorizeRoles = (...roles: string[]): RequestHandler => {
  return (
    req: AuthenicationRequest,
    res: Response,
    next: NextFunction
  ): void => {
    const user = (req as any).user
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ msg: "Forbidden: insufficient role" });
      return;
    }
    next();
  };
};
