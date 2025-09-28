import { Request, Response } from "express";
import { z } from "zod";
import { FollowService } from "@services/social/followService";
import { NotificationService } from "@services/social/notificationService";
import { Types } from "mongoose";

const service = new FollowService();

// Schema de validación para follow/unfollow
const FollowSchema = z.object({
  targetUserId: z.string().length(24, "ID de usuario inválido"),
});

// Schema de validación para paginación
const PaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export const followUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { targetUserId } = FollowSchema.parse(req.body);
    const currentUserId = req.currentUser.id;

    console.log(
      `👥 Usuario ${currentUserId} intentando seguir a ${targetUserId}`
    );

    const result = await service.follow(currentUserId, targetUserId);

    console.log(
      `✅ Follow creado exitosamente: ${currentUserId} -> ${targetUserId}`
    );

    // 🔔 NUEVO: Crear notificación de nuevo seguidor
    try {
      await NotificationService.handleNewFollow(
        new Types.ObjectId(currentUserId),
        new Types.ObjectId(targetUserId)
      );
    } catch (error) {
      console.error("❌ Error creando notificación de follow:", error);
    }

    res.json({
      success: true,
      data: result,
      message: "Usuario seguido exitosamente",
    });
  } catch (error: any) {
    console.error("❌ Error al seguir usuario:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: "Datos inválidos",
      });
    } else {
      res.status(400).json({
        success: false,
        error: error.message || "Error interno del servidor",
      });
    }
  }
};

export const unfollowUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { targetUserId } = FollowSchema.parse(req.body);
    const currentUserId = req.currentUser.id;

    console.log(
      `👥 Usuario ${currentUserId} intentando dejar de seguir a ${targetUserId}`
    );

    const result = await service.unfollow(currentUserId, targetUserId);

    console.log(`✅ Unfollow exitoso: ${currentUserId} -> ${targetUserId}`);

    res.json({
      success: true,
      data: result,
      message: "Dejaste de seguir al usuario",
    });
  } catch (error: any) {
    console.error("❌ Error al dejar de seguir usuario:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: "Datos inválidos",
      });
    } else {
      res.status(400).json({
        success: false,
        error: error.message || "Error interno del servidor",
      });
    }
  }
};

export const getFollowStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.params.userId;
    const viewerId = (req.query.viewerId as string) || req.currentUser?.id;

    console.log(`📊 Obteniendo estadísticas de follows para usuario ${userId}`);

    const result = await service.getFollowStats(userId, viewerId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("❌ Error al obtener estadísticas de follows:", error);
    res.status(error.message === "Usuario no encontrado" ? 404 : 500).json({
      success: false,
      error: error.message || "Error interno del servidor",
    });
  }
};

export const listFollowers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.params.userId;
    const { cursor, limit } = PaginationSchema.parse(req.query);
    const viewerId = req.currentUser?.id;

    console.log(`👥 Obteniendo seguidores de ${userId}, limit: ${limit}`);

    const result = await service.followers(userId, cursor, limit, viewerId);

    console.log(
      `✅ Seguidores obtenidos: ${result.users.length}/${result.total} total`
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("❌ Error al obtener seguidores:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Error interno del servidor",
    });
  }
};

export const listFollowing = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.params.userId;
    const { cursor, limit } = PaginationSchema.parse(req.query);
    const viewerId = req.currentUser?.id;

    console.log(
      `👥 Obteniendo usuarios seguidos por ${userId}, limit: ${limit}`
    );

    const result = await service.following(userId, cursor, limit, viewerId);

    console.log(
      `✅ Usuarios seguidos obtenidos: ${result.users.length}/${result.total} total`
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("❌ Error al obtener usuarios seguidos:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Error interno del servidor",
    });
  }
};

export const suggestions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.currentUser.id;
    const limit = Math.min(Number(req.query.limit) || 10, 20);

    console.log(`🔍 Obteniendo sugerencias para usuario ${currentUserId}`);

    const result = await service.suggestions(currentUserId, limit);

    console.log(`✅ Sugerencias obtenidas: ${result.users.length} usuarios`);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("❌ Error al obtener sugerencias:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Error interno del servidor",
    });
  }
};
