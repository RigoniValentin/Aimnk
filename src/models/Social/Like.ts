import mongoose, { Schema } from "mongoose";

const LikeSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetType: { type: String, enum: ["post", "comment"], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

LikeSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });

export const LikeModel = mongoose.model("Like", LikeSchema);
