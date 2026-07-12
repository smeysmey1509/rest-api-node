import { ErrorRequestHandler, Request, RequestHandler } from "express";
import { AppError } from "../errors/app-error";
import { ErrorCodes } from "../errors/error-codes";
import { isMongoDuplicateKeyError, toDuplicateIdentifierError } from "../errors/mongo-error";

type RequestWithContext = Request & { requestId?: string };

const getRequestId = (req: Request, responseRequestId: string | number | string[] | undefined) =>
  (req as RequestWithContext).requestId ?? responseRequestId ?? "unknown";

export const notFoundMiddleware: RequestHandler = (req, _res, next) => {
  next(
    new AppError(
      `Route not found: ${req.method} ${req.originalUrl}`,
      404,
      ErrorCodes.ResourceNotFound,
    ),
  );
};

export const errorMiddleware: ErrorRequestHandler = (rawError, req, res, _next) => {
  const err = isMongoDuplicateKeyError(rawError) ? toDuplicateIdentifierError(rawError) : rawError;
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    // Compatibility aliases; new clients must read the nested error envelope.
    message: err instanceof Error ? err.message : "Internal server error",
    code: err instanceof AppError ? err.code ?? ErrorCodes.InternalError : ErrorCodes.InternalError,
    details: err instanceof AppError ? err.details ?? [] : [],
    error: {
      code: err instanceof AppError ? err.code ?? ErrorCodes.InternalError : ErrorCodes.InternalError,
      message: err instanceof Error ? err.message : "Internal server error",
      details: err instanceof AppError ? err.details ?? [] : [],
      requestId: getRequestId(req, res.getHeader("x-request-id")),
      stack: !isProduction && err instanceof Error ? err.stack : undefined,
    },
  });
};
