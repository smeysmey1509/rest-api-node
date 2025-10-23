import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";

interface JwtPayload {
  id: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export interface AuthenicationRequest extends Request {
  user?: JwtPayload;
  file?: Express.Multer.File;
  files?:
    | Express.Multer.File[]
    | { [fieldname: string]: Express.Multer.File[] };
}

export const authenticateToken = (
  req: AuthenicationRequest,
  res: Response,
  next: NextFunction
): void => {
  const expectedApiKey = process.env.API_KEY;

  if (!expectedApiKey) {
    res.status(500).json({ error: "API key not configured" });
    return;
  }

  const apiKey = req.headers["x-api-key"] as string | undefined;

  if (!apiKey) {
    res.status(401).json({ message: "API key required" });
    return;
  }

  if (apiKey !== expectedApiKey) {
    res.status(403).json({ message: "Invalid API key" });
    return;
  }

  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    req.user = {
      id: process.env.API_KEY_USER_ID ?? "service-account",
      role: process.env.API_KEY_ROLE ?? "system",
    };
    next();
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
    const user = (req as any).user;
    if (!user || !roles.includes(user.role)) {
      res.status(403).json({ msg: "Forbidden: insufficient role" });
      return;
    }
    next();
  };
};
