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

  async listPostComments(postId: string, userId?: string) {
    const comments = await CommentModel.find({ postId, isActive: true }).sort({
      createdAt: 1,
    });

    if (!userId) {
      return comments;
    }

    // Si hay userId, incluir el campo isLiked para cada comentario
    const { LikeModel } = await import("@models/Social/Like");
    const commentIds = comments.map((c) => c._id);

    // Obtener todos los likes del usuario para estos comentarios de una vez
    const userLikes = await LikeModel.find({
      targetType: "comment",
      targetId: { $in: commentIds },
      userId,
    });

    // Crear un Set para búsqueda rápida
    const likedCommentIds = new Set(
      userLikes.map((like) => like.targetId.toString())
    );

    // Agregar el campo isLiked a cada comentario
    return comments.map((comment) => ({
      ...comment.toObject(),
      isLiked: likedCommentIds.has(comment._id.toString()),
    }));
  }

  async deleteComment(commentId: string, authorId: string) {
    console.log(
      `🗑️ [CommentService] Iniciando eliminación de comentario: ${commentId}`
    );

    // Verificar que el comentario existe y pertenece al usuario
    const comment = await CommentModel.findById(commentId);
    if (!comment) {
      throw new Error("Comentario no encontrado");
    }

    if (comment.authorId.toString() !== authorId) {
      throw new Error("No tienes permisos para eliminar este comentario");
    }

    // Función recursiva para obtener todos los comentarios hijos
    const getAllChildComments = async (parentId: string): Promise<string[]> => {
      const children = await CommentModel.find({ parentCommentId: parentId });
      let allChildren: string[] = [];

      for (const child of children) {
        allChildren.push(child._id.toString());
        // Recursivamente obtener los hijos de este hijo
        const grandChildren = await getAllChildComments(child._id.toString());
        allChildren = [...allChildren, ...grandChildren];
      }

      return allChildren;
    };

    // Obtener todos los comentarios que se van a eliminar (el comentario + todos sus hijos)
    const childCommentIds = await getAllChildComments(commentId);
    const allCommentIdsToDelete = [commentId, ...childCommentIds];

    console.log(
      `🗑️ [CommentService] Eliminando ${allCommentIdsToDelete.length} comentarios en cascada: ${allCommentIdsToDelete}`
    );

    // Eliminar todos los comentarios (padre e hijos)
    const deleteResult = await CommentModel.deleteMany({
      _id: { $in: allCommentIdsToDelete },
    });

    // Actualizar el contador de comentarios del post
    await PostModel.findByIdAndUpdate(comment.postId, {
      $inc: { commentsCount: -deleteResult.deletedCount },
    });

    // Si el comentario eliminado era una respuesta, actualizar el contador del padre
    if (comment.parentCommentId) {
      await CommentModel.findByIdAndUpdate(comment.parentCommentId, {
        $inc: { repliesCount: -childCommentIds.length - 1 }, // -1 por el comentario actual + los hijos
      });
    }

    console.log(
      `✅ [CommentService] Eliminados ${deleteResult.deletedCount} comentarios exitosamente`
    );

    return {
      deletedCount: deleteResult.deletedCount,
      deletedCommentIds: allCommentIdsToDelete,
      postId: comment.postId.toString(),
    };
  }

  async toggleCommentLike(commentId: string, userId: string) {
    console.log(
      `❤️ [CommentService] Toggle like - Comentario: ${commentId}, Usuario: ${userId}`
    );

    // Verificar que el comentario existe
    const comment = await CommentModel.findById(commentId);
    if (!comment) {
      throw new Error("Comentario no encontrado");
    }

    // Importar LikeModel aquí para evitar problemas de dependencias circulares
    const { LikeModel } = await import("@models/Social/Like");

    // Buscar si ya existe el like
    const existingLike = await LikeModel.findOne({
      targetType: "comment",
      targetId: commentId,
      userId,
    });

    let isLiked: boolean;
    let likesCount: number;

    if (existingLike) {
      // Remove like
      await existingLike.deleteOne();
      await CommentModel.findByIdAndUpdate(commentId, {
        $inc: { likesCount: -1 },
      });
      isLiked = false;
      console.log(
        `💔 [CommentService] Like removido para comentario ${commentId}`
      );
    } else {
      // Add like
      await LikeModel.create({
        targetType: "comment",
        targetId: commentId,
        userId,
      });
      await CommentModel.findByIdAndUpdate(commentId, {
        $inc: { likesCount: 1 },
      });
      isLiked = true;
      console.log(
        `❤️ [CommentService] Like agregado para comentario ${commentId}`
      );
    }

    // Obtener el comentario actualizado
    const updatedComment = await CommentModel.findById(commentId);
    likesCount = updatedComment?.likesCount || 0;

    const result = {
      commentId,
      isLiked,
      likesCount,
      userId,
      postId: String(comment.postId),
    };

    console.log(`✅ [CommentService] Toggle like completado:`, result);
    console.log(`🔍 [CommentService] postId debug:`, {
      original: comment.postId,
      type: typeof comment.postId,
      string: String(comment.postId),
      toString: comment.postId?.toString?.(),
    });
    return result;
  }
}
