import mongoose, { Schema } from "mongoose";

const BookmarkSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    postId: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

BookmarkSchema.index({ userId: 1, postId: 1 }, { unique: true });

export const BookmarkModel = mongoose.model("Bookmark", BookmarkSchema);
