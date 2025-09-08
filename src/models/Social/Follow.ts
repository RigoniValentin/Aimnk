import mongoose, { Schema } from "mongoose";

const FollowSchema = new Schema(
  {
    followerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    followingId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

FollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

export const FollowModel = mongoose.model("Follow", FollowSchema);
