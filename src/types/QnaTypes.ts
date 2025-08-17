import { Document, Types } from "mongoose";

export type QnaStatus = "pending" | "answered";

export interface QnaQuestion extends Document {
  userId: Types.ObjectId;
  userName: string;
  question: string;
  answer?: string;
  status: QnaStatus;
  createdAt: Date;
  answeredAt?: Date;
  answeredById?: Types.ObjectId;
  answeredByName?: string;
}

export interface IQnaRepository {
  create(doc: Partial<QnaQuestion>): Promise<QnaQuestion>;
  findAll(): Promise<QnaQuestion[]>;
  findMine(userId: Types.ObjectId): Promise<QnaQuestion[]>;
  findById(id: string): Promise<QnaQuestion | null>;
  update(id: string, data: Partial<QnaQuestion>): Promise<QnaQuestion | null>;
  countByUser(userId: Types.ObjectId): Promise<number>;
  listByStatus(status: QnaStatus): Promise<QnaQuestion[]>;
}

export interface IQnaService {
  listAll(): Promise<QnaQuestion[]>;
  listMine(userId: Types.ObjectId): Promise<QnaQuestion[]>;
  createQuestion(params: {
    userId: Types.ObjectId;
    userName: string;
    question: string;
  }): Promise<QnaQuestion>;
  listPending(): Promise<QnaQuestion[]>;
  listAnswered(): Promise<QnaQuestion[]>;
  answer(
    id: string,
    answer: string,
    adminId: Types.ObjectId,
    adminName: string
  ): Promise<QnaQuestion>;
}
