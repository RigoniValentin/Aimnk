import mongoose, { Schema } from "mongoose";

const CommentSchema = new Schema(
  {
    content: { type: String, required: true, minlength: 1, maxlength: 500 },
    authorId: {
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
    parentCommentId: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    likesCount: { type: Number, default: 0 },
    repliesCount: { type: Number, default: 0 },
    mentions: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false }
);

CommentSchema.index({ postId: 1, createdAt: -1 });

export const CommentModel = mongoose.model("Comment", CommentSchema);
