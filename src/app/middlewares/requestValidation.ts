import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
const requestValidation = (shema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await shema.parseAsync(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
};
export default requestValidation;
