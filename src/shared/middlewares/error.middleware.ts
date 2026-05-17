import { ErrorRequestHandler, RequestHandler } from "express";
import { AppError } from "../errors/app-error";

export const notFoundMiddleware: RequestHandler = (req, _res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

export const errorMiddleware: ErrorRequestHandler = (err, _req, res, _next) => {
  const statusCode = err?.statusCode || 500;
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message: err?.message || "Internal server error",
    code: err?.code,
    details: err?.details,
    stack: isProduction ? undefined : err?.stack,
  });
};
