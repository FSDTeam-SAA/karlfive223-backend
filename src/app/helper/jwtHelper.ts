import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import AppError from "../error/appError";

const generateToken = <T>(
  user: T | any,
  secret: Secret,
  expiresIn: string | any
) => {
  const token = jwt.sign(user, secret as Secret, {
    algorithm: "HS256",
    expiresIn,
  });

  if (!token) throw new AppError(400, "token not generated");
  return token;
};

const verifyToken = <T>(token: T | any, secret: Secret) => {
  const decoded = jwt.verify(token, secret as Secret) as JwtPayload;
  if (!decoded) throw new AppError(400, "token not verified");
  return decoded;
};

export const jwtHelper = { generateToken, verifyToken };
