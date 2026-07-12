import { randomUUID } from "crypto";
import { RequestHandler } from "express";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      correlationId?: string;
    }
  }
}

const safeHeader = (value: string | string[] | undefined) =>
  typeof value === "string" && /^[A-Za-z0-9._:-]{1,128}$/.test(value) ? value : undefined;

export const requestContextMiddleware: RequestHandler = (req, res, next) => {
  req.requestId = safeHeader(req.headers["x-request-id"]) ?? randomUUID();
  req.correlationId = safeHeader(req.headers["x-correlation-id"]) ?? req.requestId;
  res.setHeader("x-request-id", req.requestId);
  res.setHeader("x-correlation-id", req.correlationId);
  next();
};

