import { NextFunction, Request, Response } from "express";
import config from "../config";

const globalErrorHander = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message,
    stack: config.env === "development" ? err.stack : null,
    error: config.env === "development" ? err : null,
  });
};

export default globalErrorHander;
