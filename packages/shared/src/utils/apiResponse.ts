import { Response } from "express";

const success = (
  res: Response,
  data: unknown = null,
  message = "Success",
  status = 200
) =>
  res.status(status).json({
    success: true,
    message,
    data,
  });

export const apiResponse = {
  success,

  created(res: Response, data: unknown = null, message = "Created") {
    return success(res, data, message, 201);
  },

  error(
    res: Response,
    message = "Error",
    status = 500,
    details?: unknown,
    code?: string
  ) {
    return res.status(status).json({
      success: false,
      message,
      code,
      details,
    });
  },
};
