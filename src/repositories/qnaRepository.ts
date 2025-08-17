import { Types } from "mongoose";
import { QnaQuestionModel } from "@models/QnaQuestion";
import { IQnaRepository, QnaQuestion, QnaStatus } from "types/QnaTypes";

export class QnaRepository implements IQnaRepository {
  async create(doc: Partial<QnaQuestion>): Promise<QnaQuestion> {
    const q = new QnaQuestionModel(doc);
    return q.save();
  }

  async findAll(): Promise<QnaQuestion[]> {
    return QnaQuestionModel.find().sort({ createdAt: -1 }).lean();
  }

  async findMine(userId: Types.ObjectId): Promise<QnaQuestion[]> {
    return QnaQuestionModel.find({ userId }).sort({ createdAt: -1 }).lean();
  }

  async findById(id: string): Promise<QnaQuestion | null> {
    return QnaQuestionModel.findById(id).lean();
  }

  async update(
    id: string,
    data: Partial<QnaQuestion>
  ): Promise<QnaQuestion | null> {
    return QnaQuestionModel.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async countByUser(userId: Types.ObjectId): Promise<number> {
    return QnaQuestionModel.countDocuments({ userId }).exec();
  }

  async listByStatus(status: QnaStatus): Promise<QnaQuestion[]> {
    if (status === "pending") {
      return QnaQuestionModel.find({ status: "pending" })
        .sort({ createdAt: -1 })
        .lean();
    }
    // answered: ordenar por answeredAt desc, luego createdAt desc
    return QnaQuestionModel.find({ status: "answered" })
      .sort({ answeredAt: -1, createdAt: -1 })
      .lean();
  }
}
