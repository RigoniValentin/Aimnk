import { Request, Response } from "express";
import { z } from "zod";
import { CommentService } from "@services/social/commentService";
import { PostService } from "@services/social/postService";
import { emitToCommunity, emitToPost } from "@socket/io";
import { NotificationService } from "@services/social/notificationService";
import { Types } from "mongoose";

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

      // 🔔 NUEVO: Crear notificaciones
      // 1. Notificación al autor del post
      await NotificationService.handleNewComment(
        new Types.ObjectId(parsed.postId),
        comment._id,
        new Types.ObjectId(req.currentUser.id)
      );

      // 2. Detectar y notificar menciones (@username)
      const mentions = NotificationService.extractMentions(parsed.content);
      if (mentions.length > 0) {
        const mentionedUserIds = await NotificationService.resolveUsernames(
          mentions
        );
        if (mentionedUserIds.length > 0) {
          await NotificationService.handleMention(
            comment._id,
            mentionedUserIds,
            new Types.ObjectId(req.currentUser.id)
          );
        }
      }
    } catch (error) {
      console.error("❌ Error en eventos de comentario:", error);
    }
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const listPostComments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Incluir el userId si el usuario está autenticado para agregar el campo isLiked
    const userId = req.currentUser?.id;
    const comments = await commentService.listPostComments(
      req.params.postId,
      userId
    );
    res.json({ success: true, data: comments });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const postService = new PostService();
export const likeComment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.currentUser.id;

    console.log(
      `❤️ [LIKE COMMENT] Usuario ${userId} toggle like en comentario ${id}`
    );

    // Usar el nuevo método específico para comentarios
    const result = await commentService.toggleCommentLike(id, userId);

    console.log(`✅ [LIKE COMMENT] Toggle like exitoso:`, result);

    // Emitir evento WebSocket automáticamente
    try {
      console.log(`🔍 [LIKE COMMENT] Emitiendo WebSocket:`, {
        sala: `post-${result.postId}`,
        evento: "comment-liked",
        postId: result.postId,
        postIdType: typeof result.postId,
      });

      emitToPost(result.postId, "comment-liked", {
        commentId: result.commentId,
        postId: result.postId,
        likesCount: result.likesCount,
        isLiked: result.isLiked,
        userId: result.userId,
      });

      console.log(
        `📡 [LIKE COMMENT] WebSocket emitido para post ${result.postId}`
      );
    } catch (socketError) {
      console.warn("⚠️ [LIKE COMMENT] Error emitiendo WebSocket:", socketError);
    }

    // Devolver datos completos
    res.json({
      success: true,
      data: {
        commentId: result.commentId,
        isLiked: result.isLiked,
        likesCount: result.likesCount,
        userId: result.userId,
      },
    });
  } catch (error: any) {
    console.error("❌ [LIKE COMMENT] Error:", error);

    if (error.message === "Comentario no encontrado") {
      res.status(404).json({
        success: false,
        message: "Comentario no encontrado",
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }
};

export const deleteComment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.currentUser.id;

    console.log(
      `🗑️ [DELETE COMMENT] Usuario ${userId} eliminando comentario ${id}`
    );

    // Llamar al servicio para eliminar el comentario
    const result = await commentService.deleteComment(id, userId);

    console.log(
      `✅ [DELETE COMMENT] Eliminación exitosa: ${result.deletedCount} comentarios eliminados`
    );

    // Emitir evento WebSocket para notificar la eliminación
    try {
      emitToPost(result.postId, "comment-deleted", {
        commentId: id,
        deletedCommentIds: result.deletedCommentIds,
        postId: result.postId,
        deletedCount: result.deletedCount,
      });

      emitToCommunity("comment-deleted", {
        postId: result.postId,
        deletedCount: result.deletedCount,
      });
    } catch (socketError) {
      console.warn(
        "⚠️ [DELETE COMMENT] Error emitiendo WebSocket:",
        socketError
      );
    }

    res.json({
      success: true,
      message: `Comentario eliminado exitosamente (${result.deletedCount} comentarios en total)`,
      data: {
        deletedCommentIds: result.deletedCommentIds,
        deletedCount: result.deletedCount,
      },
    });
  } catch (error: any) {
    console.error("❌ [DELETE COMMENT] Error:", error);

    if (error.message === "Comentario no encontrado") {
      res.status(404).json({
        success: false,
        message: "Comentario no encontrado",
      });
    } else if (
      error.message === "No tienes permisos para eliminar este comentario"
    ) {
      res.status(403).json({
        success: false,
        message: "No tienes permisos para eliminar este comentario",
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }
};
