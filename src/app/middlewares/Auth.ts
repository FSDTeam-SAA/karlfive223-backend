import { NextFunction, Request, Response } from "express";
import AppError from "../error/appError";
import { jwtHelper } from "../helper/jwtHelper";
import config from "../config";
import { JwtPayload, Secret } from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload | any;
    }
  }
}

const auth = (...request: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        throw new AppError(401, "Please provide token");
      }

      const decoded = jwtHelper.verifyToken(token, config.jwt.secret as Secret);
      if (!request.includes(decoded.role)) {
        throw new AppError(401, "You are not authorized");
      }

      req.user = decoded;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export default auth;
