import { Types } from "mongoose";
import { IQnaRepository, IQnaService, QnaQuestion } from "types/QnaTypes";

const MAX_PER_USER = 3;

export class QnaService implements IQnaService {
  constructor(private repo: IQnaRepository) {}

  listAll(): Promise<QnaQuestion[]> {
    return this.repo.findAll();
  }

  listMine(userId: Types.ObjectId): Promise<QnaQuestion[]> {
    return this.repo.findMine(userId);
  }

  async createQuestion(params: {
    userId: Types.ObjectId;
    userName: string;
    question: string;
  }): Promise<QnaQuestion> {
    const q = params.question?.trim();
    if (!q || q.length < 1 || q.length > 800) {
      const e: any = new Error("ValidationError");
      e.details = ["question must be 1..800 chars"];
      e.status = 400;
      throw e;
    }
    const current = await this.repo.countByUser(params.userId);
    if (current >= MAX_PER_USER) {
      const e: any = new Error("Conflict");
      e.details = ["limit 3 questions reached for user"];
      e.status = 409;
      throw e;
    }
    return this.repo.create({
      userId: params.userId,
      userName: params.userName,
      question: q,
      status: "pending",
    });
  }

  listPending(): Promise<QnaQuestion[]> {
    return this.repo.listByStatus("pending");
  }

  listAnswered(): Promise<QnaQuestion[]> {
    return this.repo.listByStatus("answered");
  }

  async answer(
    id: string,
    answer: string,
    adminId: Types.ObjectId,
    adminName: string
  ): Promise<QnaQuestion> {
    const a = answer?.trim();
    if (!a || a.length < 1 || a.length > 2000) {
      const e: any = new Error("ValidationError");
      e.details = ["answer must be 1..2000 chars"];
      e.status = 400;
      throw e;
    }
    const existing = await this.repo.findById(id);
    if (!existing) {
      const e: any = new Error("NotFound");
      e.status = 404;
      throw e;
    }
    if (existing.status === "answered") {
      const e: any = new Error("Conflict");
      e.status = 409;
      throw e;
    }
    const now = new Date();
    const updated = await this.repo.update(id, {
      answer: a,
      status: "answered",
      answeredAt: now,
      answeredById: adminId,
      answeredByName: adminName,
    });
    // updated no debería ser null tras findById previo
    return updated as QnaQuestion;
  }
}
