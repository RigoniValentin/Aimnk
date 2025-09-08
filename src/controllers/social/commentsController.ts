import { Request, Response } from "express";
import { z } from "zod";
import { CommentService } from "@services/social/commentService";
import { PostService } from "@services/social/postService";
import { emitToCommunity, emitToPost } from "@socket/io";

const commentService = new CommentService();

const CommentSchema = z.object({
  postId: z.string().min(1),
  content: z.string().min(1).max(500),
  parentCommentId: z.string().optional(),
});

export const createComment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const parsed = CommentSchema.parse(req.body);
    const comment = await commentService.createComment(
      req.currentUser.id,
      parsed.postId,
      parsed.content,
      parsed.parentCommentId
    );
    res.json({ success: true, data: comment });
    // Emit new-comment to post room and community
    try {
      emitToPost(parsed.postId, "new-comment", {
        postId: parsed.postId,
        comment: {
          id: String(comment._id),
          author: {
            id: req.currentUser.id,
            username: req.currentUser.username,
            name: req.currentUser.name,
            avatar: (req.currentUser as any).avatar,
          },
          content: comment.content,
          createdAt: comment.createdAt,
          likes: comment.likesCount,
          replies: [],
        },
      });
      emitToCommunity("new-comment", { postId: parsed.postId });
    } catch {}
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const listPostComments = async (
  req: Request,
  res: Response
): Promise<void> => {
  const comments = await commentService.listPostComments(req.params.postId);
  res.json({ success: true, data: comments });
};

const postService = new PostService();
export const likeComment = async (
  req: Request,
  res: Response
): Promise<void> => {
  const result = await postService.likeToggle(
    "comment",
    req.params.id,
    req.currentUser.id
  );
  res.json({ success: true, data: result });
};
