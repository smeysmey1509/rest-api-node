export class AppError extends Error {
  statusCode: number;
  code?: string;
  details?: unknown;
  isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    code?: string,
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}
