import mongoose, { Schema } from "mongoose";

const PostSchema = new Schema(
  {
    content: { type: String, required: true, minlength: 1, maxlength: 500 },
    images: {
      type: [String],
      default: [],
      validate: (arr: string[]) => arr.length <= 4,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },
    hashtags: { type: [String], default: [], index: true },
    mentions: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false }
);

PostSchema.index({ createdAt: -1 });
PostSchema.index({ hashtags: 1, createdAt: -1 });

export const PostModel = mongoose.model("Post", PostSchema);
