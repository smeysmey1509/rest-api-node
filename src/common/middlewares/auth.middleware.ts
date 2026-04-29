import { NextFunction, Request, RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";
import { jwtConfig } from "../../config/jwt";
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

const extractBearerToken = (req: Request) => {
  const authHeader = req.headers.authorization;
  return authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : undefined;
};

const verifyAccessToken = (token: string): JwtPayload => {
  const decoded = jwt.verify(token, jwtConfig.accessSecret, {
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
  }) as jwt.JwtPayload;

  if (!decoded.id || !decoded.role) {
    throw new Error("Invalid token payload");
  }

  return {
    id: String(decoded.id),
    role: normalizeRole(String(decoded.role)),
  };
};

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const token = extractBearerToken(req);

  if (token) {
    if (!jwtConfig.accessSecret) {
      res.status(500).json({ message: "JWT secret not configured" });
      return;
    }

    try {
      req.user = verifyAccessToken(token);
      next();
      return;
    } catch {
      res.status(401).json({ message: "Invalid or expired token" });
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
  const token = extractBearerToken(req);

  if (!token || !jwtConfig.accessSecret) {
    next();
    return;
  }

  try {
    req.user = verifyAccessToken(token);
  } catch {
    // Public routes must stay public; ignore bad optional tokens.
  }

  next();
};
