import { ErrorCodes } from "./error-codes";
import { AppError } from "./app-error";

type MongoDuplicateError = Error & {
  code?: number;
  keyPattern?: Record<string, number>;
  keyValue?: Record<string, unknown>;
};

export const isMongoDuplicateKeyError = (error: unknown): error is MongoDuplicateError =>
  error instanceof Error && (error as MongoDuplicateError).code === 11000;

export const toDuplicateIdentifierError = (error: MongoDuplicateError) =>
  new AppError(
    "A resource with the same identifier already exists.",
    409,
    ErrorCodes.DuplicateIdentifier,
    { fields: Object.keys(error.keyPattern ?? error.keyValue ?? {}) },
  );

