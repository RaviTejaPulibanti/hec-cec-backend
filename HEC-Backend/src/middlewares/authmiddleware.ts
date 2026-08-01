import  type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/user.js";

const authMiddleware = async (
  req: Request | any,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1] as string;

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    req.user = {
      ...decoded,
      _id: decoded?._id || decoded?.userId,
    };
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

export default authMiddleware;