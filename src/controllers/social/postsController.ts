import { Request, Response } from "express";
import { z } from "zod";
import { PostService } from "@services/social/postService";
import { PostModel } from "@models/Social/Post";
import { upload } from "@middlewares/upload";
import { emitToCommunity, emitToPost, emitToUser, hasIO } from "@socket/io";
import { UserModel } from "@models/Users";
import { NotificationService } from "@services/social/notificationService";
import { Types } from "mongoose";

const postService = new PostService();

const PostSchema = z.object({
  content: z.string().min(1).max(1000), // Aumentado de 500 a 1000 caracteres
});

export const createPost = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    console.log(
      "🔍 DEBUG: Creando post - Longitud del contenido:",
      req.body.content?.length
    );
    console.log(
      "🔍 DEBUG: Contenido recibido:",
      req.body.content?.substring(0, 100) + "..."
    );

    const parsed = PostSchema.parse(req.body);
    const images = Array.isArray((req as any).files)
      ? (req as any).files.map((f: any) => `/uploads/social/${f.filename}`)
      : [];

    // Procesar imageCropData si viene en la petición
    let imageCropData: any[] = [];
    if (req.body.imageCropData) {
      try {
        imageCropData = JSON.parse(req.body.imageCropData);
        console.log("✂️ Datos de crop recibidos:", imageCropData);

        // Validar que imageCropData tenga el formato correcto
        if (imageCropData.length > 0) {
          imageCropData = imageCropData.map((crop) => ({
            x: Math.max(0, Math.min(100, crop.x || 50)),
            y: Math.max(0, Math.min(100, crop.y || 50)),
            scale: Math.max(50, Math.min(200, crop.scale || 100)),
          }));
        }
      } catch (error) {
        console.error("❌ Error parsing imageCropData:", error);
        imageCropData = [];
      }
    }

    console.log("📸 Creando post con imageCropData:", {
      imagesCount: images.length,
      cropDataCount: imageCropData.length,
      cropData: imageCropData,
    });

    const post = await postService.createPost(
      req.currentUser.id,
      parsed.content,
      images,
      imageCropData
    );
    res.json({ success: true, data: post });
    // Broadcast websocket events
    try {
      const author = await UserModel.findById(req.currentUser.id).select(
        "_id username name avatar"
      );
      const wsPayload = {
        id: String(post._id),
        author: {
          id: String(author?._id),
          username: author?.username,
          name: author?.name,
          avatar: author?.avatar,
        },
        content: post.content,
        images: post.images,
        imageCropData: post.imageCropData,
        createdAt: post.createdAt,
        likes: post.likesCount,
        comments: post.commentsCount,
        shares: post.sharesCount,
        isLiked: false,
        isBookmarked: false,
      };
      emitToCommunity("new-post", wsPayload);
      emitToUser(req.currentUser.id, "new-post-created", wsPayload);
    } catch (e) {
      // swallow ws errors
    }

    // 🔔 Detectar y notificar menciones (@username) en el post
    try {
      const mentions = NotificationService.extractMentions(parsed.content);
      if (mentions.length > 0) {
        const mentionedUserIds = await NotificationService.resolveUsernames(
          mentions
        );
        if (mentionedUserIds.length > 0) {
          await NotificationService.handlePostMention(
            new Types.ObjectId(String(post._id)),
            mentionedUserIds,
            new Types.ObjectId(req.currentUser.id)
          );
        }
      }
    } catch (error) {
      console.error("❌ Error en notificaciones de menciones del post:", error);
    }
  } catch (err: any) {
    console.error("❌ ERROR en createPost:", err);

    // Si es error de validación de Zod, proporcionar detalles específicos
    if (err.name === "ZodError") {
      console.error("🔍 Errores de validación:", err.issues);
      res.status(400).json({
        success: false,
        message:
          "Datos inválidos: " +
          err.issues
            .map((i: any) => `${i.path.join(".")}: ${i.message}`)
            .join(", "),
        details: err.issues,
      });
      return;
    }

    res
      .status(400)
      .json({ success: false, message: err.message || "Error desconocido" });
  }
};

export const getPost = async (req: Request, res: Response): Promise<void> => {
  const post = await postService.getPost(req.params.id);
  if (!post) {
    res.status(404).json({ success: false, message: "Post not found" });
    return;
  }
  res.json({ success: true, data: post });
};

export const deletePost = async (
  req: Request,
  res: Response
): Promise<void> => {
  const ok = await postService.deletePost(req.params.id, req.currentUser.id);
  if (!ok) {
    res
      .status(403)
      .json({ success: false, message: "Not allowed or not found" });
    return;
  }
  res.json({ success: true, data: true });
  // Emit delete events
  try {
    emitToCommunity("post-deleted", { postId: req.params.id });
    emitToPost(req.params.id, "post-deleted", { postId: req.params.id });
  } catch {}
};

export const likePost = async (req: Request, res: Response): Promise<void> => {
  const result = await postService.likeToggle(
    "post",
    req.params.id,
    req.currentUser.id
  );
  const updated = await PostModel.findById(req.params.id).select("likesCount");
  const likesCount = updated?.likesCount ?? 0;
  res.json({ success: true, data: { ...result, likesCount } });

  // Emit like/unlike events
  try {
    const event = result.liked ? "post-liked" : "post-unliked";
    const base = { postId: req.params.id, likesCount } as any;
    const payload = result.liked
      ? { ...base, likedBy: req.currentUser.id }
      : { ...base, unlikedBy: req.currentUser.id };
    emitToCommunity(event, payload);
    emitToPost(req.params.id, event, payload);

    // 🔔 NUEVO: Crear notificación cuando se da like
    if (result.liked) {
      console.log(
        `🔔 TRIGGER: Intentando crear notificación de like - Post: ${req.params.id}, Usuario: ${req.currentUser.id}`
      );
      try {
        await NotificationService.handlePostLike(
          new Types.ObjectId(req.params.id),
          new Types.ObjectId(req.currentUser.id)
        );
        console.log(`✅ Notificación de like creada exitosamente`);
      } catch (notifError) {
        console.error(
          `❌ Error específico creando notificación de like:`,
          notifError
        );
      }
    }
  } catch (error) {
    console.error("❌ Error en eventos de like:", error);
  }
};

export const bookmarkPost = async (
  req: Request,
  res: Response
): Promise<void> => {
  const result = await postService.bookmarkToggle(
    req.params.id,
    req.currentUser.id
  );
  res.json({ success: true, data: result });
};

export const feed = async (req: Request, res: Response): Promise<void> => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const result = await postService.feed(req.currentUser.id, page, limit);
  res.json({
    success: true,
    data: result.items,
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
      hasNextPage: page * limit < result.total,
      hasPrevPage: page > 1,
    },
  });
};

export const explore = async (req: Request, res: Response): Promise<void> => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const result = await postService.explore(page, limit);
  res.json({
    success: true,
    data: result.items,
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
      hasNextPage: page * limit < result.total,
      hasPrevPage: page > 1,
    },
  });
};

export const byHashtag = async (req: Request, res: Response): Promise<void> => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const tag = req.params.tag.toLowerCase();
  const result = await postService.listByHashtag(tag, page, limit);
  res.json({
    success: true,
    data: result.items,
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
      hasNextPage: page * limit < result.total,
      hasPrevPage: page > 1,
    },
  });
};

export const trending = async (req: Request, res: Response): Promise<void> => {
  const result = await postService.trending();
  res.json({ success: true, data: result });
};

export const sharePost = async (req: Request, res: Response): Promise<void> => {
  const result = await postService.share(req.params.id);
  res.json({ success: true, data: result });
  try {
    const updated = await PostModel.findById(req.params.id).select(
      "sharesCount"
    );
    emitToPost(req.params.id, "post-updated", {
      postId: req.params.id,
      sharesCount: updated?.sharesCount ?? 0,
    });
  } catch {}
};
