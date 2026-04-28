import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError";

type Validator = (req: Request) => string[] | void;

export const validate = (validator: Validator) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const errors = validator(req) || [];
    if (errors.length) {
      next(new AppError("Validation failed", 400, "VALIDATION_ERROR", errors));
      return;
    }
    next();
  };
};
