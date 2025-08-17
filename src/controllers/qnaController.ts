import { Request, Response } from "express";
import { QnaRepository } from "@repositories/qnaRepository";
import { QnaService } from "@services/qnaService";
import { Types } from "mongoose";

const service = new QnaService(new QnaRepository());

function isAdmin(req: Request) {
  const roleNames = (req.currentUser?.roles || [])
    .map((r: any) => r?.name)
    .filter(Boolean);
  const hasPermission = req.currentUser?.permissions?.includes("admin_granted");
  return hasPermission || roleNames.some((n: string) => n === "admin");
}

function isUser(req: Request) {
  const roleNames = (req.currentUser?.roles || [])
    .map((r: any) => r?.name)
    .filter(Boolean);
  return roleNames.some((n: string) => n === "user" || n === "admin");
}

export const listAllQna = async (req: Request, res: Response) => {
  try {
    const items = await service.listAll();
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ message: "InternalError" });
  }
};

export const listMineQna = async (req: Request, res: Response) => {
  if (!req.currentUser?._id) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  try {
    const userId = new Types.ObjectId(String(req.currentUser._id));
    const items = await service.listMine(userId);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ message: "InternalError" });
  }
};

export const createQna = async (req: Request, res: Response) => {
  if (!isUser(req)) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }
  if (!req.currentUser?._id) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  try {
    const userId = new Types.ObjectId(String(req.currentUser._id));
    const userName = String(
      req.currentUser.name || req.currentUser.email || "Usuario"
    );
    const question = String(req.body?.question || "");
    const created = await service.createQuestion({
      userId,
      userName,
      question,
    });
    res.status(201).json(created);
  } catch (err: any) {
    const status = err?.status || (err?.message === "Conflict" ? 409 : 400);
    const body: any = { message: err?.message || "ValidationError" };
    if (err?.details) body.details = err.details;
    res.status(status).json(body);
  }
};

export const listPendingQna = async (req: Request, res: Response) => {
  if (!isAdmin(req)) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }
  try {
    const items = await service.listPending();
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ message: "InternalError" });
  }
};

export const listAnsweredQna = async (req: Request, res: Response) => {
  if (!isAdmin(req)) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }
  try {
    const items = await service.listAnswered();
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ message: "InternalError" });
  }
};

export const answerQna = async (req: Request, res: Response) => {
  if (!isAdmin(req)) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }
  try {
    const { id } = req.params;
    const answer = String(req.body?.answer || "").trim();
    if (!answer || answer.length > 2000) {
      res.status(400).json({
        message: "ValidationError",
        details: ["answer must be 1..2000 chars"],
      });
      return;
    }
    const adminId = new Types.ObjectId(String(req.currentUser._id));
    const adminName = String(
      req.currentUser.name || req.currentUser.email || "Administrador"
    );
    const updated = await service.answer(id, answer, adminId, adminName);
    res.json(updated);
  } catch (err: any) {
    const status = err?.status || 500;
    res.status(status).json({ message: err?.message || "InternalError" });
  }
};
