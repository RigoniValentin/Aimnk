import mongoose, { Schema } from "mongoose";

const NotificationSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["like", "comment", "follow", "mention"],
      required: true,
    },
    message: { type: String, required: true },
    fromUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    toUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    postId: { type: Schema.Types.ObjectId, ref: "Post" },
    commentId: { type: Schema.Types.ObjectId, ref: "Comment" },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

NotificationSchema.index({ toUserId: 1, createdAt: -1 });

export const NotificationModel = mongoose.model(
  "Notification",
  NotificationSchema
);
