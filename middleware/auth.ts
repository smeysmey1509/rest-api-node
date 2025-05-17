import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { IUser } from "../src/models/User";

interface DecodedToken {
  _id: string;
  username: string;
  email: string;
  iat: number;
  exp: number;
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "No token provided or wrong format" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    req.user = {
      _id: decoded._id,
      username: decoded.username,
      email: decoded.email,
      password: "", // Password should not be included in the request
      createdAt: new Date(decoded.iat * 1000),
      updatedAt: new Date(decoded.exp * 1000),
    } as IUser;

    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: "Invalid token" });
  }
};
