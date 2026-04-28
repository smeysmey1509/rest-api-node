import { NextFunction, Request, RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";
import { normalizeRole } from "../constants/roles";

export interface JwtPayload {
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

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  file?: Express.Multer.File;
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;

  if (token) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      res.status(500).json({ error: "JWT secret not configured" });
      return;
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
      req.user = {
        id: String(decoded.id),
        role: normalizeRole(decoded.role),
      };
      next();
      return;
    } catch {
      res.status(403).json({ message: "Invalid token" });
      return;
    }
  }

  const expectedApiKey = process.env.API_KEY;
  const apiKey = req.headers["x-api-key"] as string | undefined;
  if (expectedApiKey && apiKey === expectedApiKey) {
    req.user = {
      id: process.env.API_KEY_USER_ID ?? "service-account",
      role: normalizeRole(process.env.API_KEY_ROLE ?? "ADMIN"),
    };
    next();
    return;
  }

  res.status(401).json({ message: "Authentication required" });
};

export const optionalAuth: RequestHandler = (req, _res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;
  const jwtSecret = process.env.JWT_SECRET;

  if (!token || !jwtSecret) {
    next();
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    req.user = {
      id: String(decoded.id),
      role: normalizeRole(decoded.role),
    };
  } catch {
    // Public routes must stay public; ignore bad optional tokens.
  }

  next();
};
