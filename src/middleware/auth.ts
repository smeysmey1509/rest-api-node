import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";

interface JwtPayload {
  id: string;
  role: string;
}

export interface AuthenicationRequest extends Request {
  user?: JwtPayload;
  file?: Express.Multer.File;
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
}

export const authenticateToken = (
  req: AuthenicationRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "No token provided" });
    return;
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    res.status(500).json({ error: "JWT secret not configureddddddddd" });
    return;
  }

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      res.status(403).json({ message: "Invalid token" });
      return;
    }
    (req.user = user as JwtPayload), { expiresIn: "10s" };
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
