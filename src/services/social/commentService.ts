import { CommentModel } from "@models/Social/Comment";
import { PostModel } from "@models/Social/Post";
import { extractMentions, sanitizeContent } from "./contentUtils";

export class CommentService {
  async createComment(
    authorId: string,
    postId: string,
    content: string,
    parentCommentId?: string
  ) {
    const clean = sanitizeContent(content);
    const mentions = extractMentions(clean);

    // Enforce 3 levels max
    if (parentCommentId) {
      const parent = await CommentModel.findById(parentCommentId);
      if (!parent) throw new Error("Parent comment not found");
      // Check depth
      let depth = 1;
      let currentParent: any = parent;
      while (currentParent?.parentCommentId && depth < 3) {
        currentParent = await CommentModel.findById(
          currentParent.parentCommentId
        );
        depth++;
      }
      if (currentParent?.parentCommentId)
        throw new Error("Max reply depth reached");
    }

    const comment = await CommentModel.create({
      authorId,
      postId,
      content: clean,
      parentCommentId,
      mentions,
    });
    await PostModel.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });
    if (parentCommentId)
      await CommentModel.findByIdAndUpdate(parentCommentId, {
        $inc: { repliesCount: 1 },
      });
    return comment;
  }

  async listPostComments(postId: string) {
    return CommentModel.find({ postId, isActive: true }).sort({ createdAt: 1 });
  }
}
