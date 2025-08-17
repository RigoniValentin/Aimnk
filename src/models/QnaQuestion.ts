import mongoose, { Schema, Types } from "mongoose";
import { QnaQuestion } from "types/QnaTypes";

const QnaSchema = new Schema<QnaQuestion>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userName: { type: String, required: true },
    question: { type: String, required: true, index: true },
    answer: { type: String },
    status: {
      type: String,
      enum: ["pending", "answered"],
      default: "pending",
      index: true,
    },
    answeredAt: { type: Date },
    answeredById: { type: Schema.Types.ObjectId, ref: "User" },
    answeredByName: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
    collection: "qna_questions",
  }
);

QnaSchema.index({ status: 1, createdAt: -1 });
// Texto opcional (se puede habilitar si se usa en búsquedas):
// QnaSchema.index({ question: "text", answer: "text" });

export const QnaQuestionModel = mongoose.model<QnaQuestion>(
  "QnaQuestion",
  QnaSchema
);
