import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { verifyToken } from "@middlewares/auth";

/**
 * Auth para stations: reutiliza verifyToken y setea req.userId (ObjectId)
 */
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Delegamos en verifyToken para validar y poblar req.currentUser
  verifyToken(req, res, () => {
    try {
      const id = req.currentUser?._id as any;
      if (!id || !Types.ObjectId.isValid(String(id))) {
        res.status(401).json({ message: "Invalid token" });
        return;
      }
      req.userId = new Types.ObjectId(String(id));
      next();
    } catch (err: any) {
      res.status(401).json({ message: err?.message ?? "Unauthorized" });
    }
  });
};
