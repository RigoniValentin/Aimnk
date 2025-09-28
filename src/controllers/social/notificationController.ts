import { Request, Response } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { NotificationService } from "../../services/social/notificationService";
import { NotificationPreferencesModel } from "../../models/Social/NotificationPreferences";

// Validación de esquemas con Zod
const GetNotificationsSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(parseInt(val), 50) : 20)),
  unreadOnly: z
    .string()
    .optional()
    .transform((val) => val === "true"),
  type: z
    .enum([
      "like",
      "comment",
      "follow",
      "mention",
      "reply",
      "post_shared",
      "comment_like",
      "follow_request",
      "follow_accepted",
      "achievement",
      "system",
    ])
    .optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
});

const UpdatePreferencesSchema = z.object({
  likes: z.boolean().optional(),
  comments: z.boolean().optional(),
  follows: z.boolean().optional(),
  mentions: z.boolean().optional(),
  replies: z.boolean().optional(),
  post_shared: z.boolean().optional(),
  comment_like: z.boolean().optional(),
  follow_requests: z.boolean().optional(),
  achievements: z.boolean().optional(),
  system: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
});

export class NotificationController {
  /**
   * GET /notifications - Obtener notificaciones del usuario con paginación y filtros
   */
  static async getNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = new Types.ObjectId((req as any).currentUser.id);

      // Validar y parsear query parameters
      const query = GetNotificationsSchema.parse(req.query);

      console.log(
        "🔍 Obteniendo notificaciones para usuario:",
        userId,
        "query:",
        query
      );

      const result = await NotificationService.getUserNotifications(
        userId,
        query
      );

      console.log(
        "✅ Notificaciones obtenidas:",
        result.notifications?.length || 0,
        "total:",
        result.pagination?.total || 0
      );

      // Asegurar que siempre devolvemos un array válido (nunca null/undefined)
      const notifications = result.notifications || [];
      const pagination = result.pagination || {
        page: query.page || 1,
        limit: query.limit || 20,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      };

      // Desactivar cache para evitar 304
      res.set({
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      });

      res.json({
        success: true,
        data: notifications,
        pagination: pagination,
      });
    } catch (error) {
      console.error("❌ Error obteniendo notificaciones:", error);

      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: "Parámetros inválidos",
          errors: error.errors,
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }

  /**
   * GET /notifications/stats - Obtener estadísticas de notificaciones
   */
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = new Types.ObjectId((req as any).currentUser.id);

      console.log("📊 Obteniendo estadísticas para usuario:", userId);

      const stats = await NotificationService.getNotificationStats(userId);

      console.log("✅ Estadísticas obtenidas:", stats);

      // Desactivar cache para evitar 304
      res.set({
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      });

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error(
        "❌ Error obteniendo estadísticas de notificaciones:",
        error
      );
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }

  /**
   * PATCH /notifications/:id/read - Marcar notificación específica como leída
   */
  static async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = new Types.ObjectId((req as any).currentUser.id);

      // Validar ObjectId
      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: "ID de notificación inválido",
        });
        return;
      }

      const notificationId = new Types.ObjectId(id);
      const success = await NotificationService.markAsRead(
        notificationId,
        userId
      );

      if (!success) {
        res.status(404).json({
          success: false,
          message: "Notificación no encontrada o ya marcada como leída",
        });
        return;
      }

      res.json({
        success: true,
        data: { ok: true },
      });
    } catch (error) {
      console.error("❌ Error marcando notificación como leída:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }

  /**
   * PATCH /notifications/mark-all-read - Marcar todas las notificaciones como leídas
   */
  static async markAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = new Types.ObjectId((req as any).currentUser.id);

      const markedCount = await NotificationService.markAllAsRead(userId);

      res.json({
        success: true,
        data: { markedCount },
      });
    } catch (error) {
      console.error(
        "❌ Error marcando todas las notificaciones como leídas:",
        error
      );
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }

  /**
   * DELETE /notifications/:id - Eliminar una notificación específica
   */
  static async deleteNotification(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = new Types.ObjectId((req as any).currentUser.id);

      // Validar ObjectId
      if (!Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: "ID de notificación inválido",
        });
        return;
      }

      const notificationId = new Types.ObjectId(id);
      const success = await NotificationService.deleteNotification(
        notificationId,
        userId
      );

      if (!success) {
        res.status(404).json({
          success: false,
          message: "Notificación no encontrada",
        });
        return;
      }

      res.json({
        success: true,
        data: { ok: true },
      });
    } catch (error) {
      console.error("❌ Error eliminando notificación:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }

  /**
   * GET /notifications/preferences - Obtener preferencias de notificaciones del usuario
   */
  static async getPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = new Types.ObjectId((req as any).currentUser.id);

      // Obtener o crear preferencias por defecto
      let preferences = await NotificationPreferencesModel.findOne({ userId });
      if (!preferences) {
        preferences = await NotificationPreferencesModel.create({ userId });
      }

      res.json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      console.error(
        "❌ Error obteniendo preferencias de notificaciones:",
        error
      );
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }

  /**
   * PATCH /notifications/preferences - Actualizar preferencias de notificaciones
   */
  static async updatePreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = new Types.ObjectId((req as any).currentUser.id);

      // Validar datos de entrada
      const validatedData = UpdatePreferencesSchema.parse(req.body);

      // Obtener preferencias existentes o crear nuevas
      let preferences = await NotificationPreferencesModel.findOne({ userId });
      if (!preferences) {
        preferences = await NotificationPreferencesModel.create({
          userId,
          ...validatedData,
        });
      } else {
        // Actualizar solo los campos proporcionados
        Object.assign(preferences, validatedData);
        await preferences.save();
      }

      console.log(
        `🔔 Preferencias actualizadas para usuario ${userId}:`,
        validatedData
      );

      res.json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      console.error("❌ Error actualizando preferencias:", error);

      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: "Datos de preferencias inválidos",
          errors: error.errors,
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }

  /**
   * POST /notifications/reset-preferences - Resetear preferencias a defaults (solo desarrollo)
   */
  static async resetPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = new Types.ObjectId((req as any).currentUser.id);

      // Eliminar preferencias existentes
      await NotificationPreferencesModel.deleteOne({ userId });

      // Crear nuevas preferencias con todos los valores en true
      const newPreferences = await NotificationPreferencesModel.create({
        userId,
        likes: true,
        comments: true,
        follows: true,
        mentions: true,
        replies: true,
        post_shared: true,
        comment_like: true,
        follow_requests: true,
        achievements: true,
        system: true,
        pushNotifications: true,
        emailNotifications: false,
      });

      console.log(`✅ Preferencias reseteadas para usuario ${userId}`);

      res.json({
        success: true,
        data: newPreferences,
        message:
          "Preferencias reseteadas - todas las notificaciones habilitadas",
      });
    } catch (error) {
      console.error("❌ Error reseteando preferencias:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }

  /**
   * POST /notifications/test - Crear notificaciones de prueba (solo desarrollo)
   */
  static async createTestNotification(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      // Solo permitir en desarrollo
      if (process.env.NODE_ENV === "production") {
        res.status(403).json({
          success: false,
          message: "Endpoint no disponible en producción",
        });
        return;
      }

      const userId = new Types.ObjectId((req as any).currentUser.id);

      console.log("🧪 Creando notificaciones de prueba para usuario:", userId);

      // Crear diferentes tipos de notificaciones de prueba
      const testNotifications = [
        {
          type: "like" as const,
          title: "👍 Nuevo Me Gusta",
          message: "A alguien le gustó tu publicación",
          priority: "medium" as const,
        },
        {
          type: "comment" as const,
          title: "💬 Nuevo Comentario",
          message: "Alguien comentó en tu publicación",
          priority: "high" as const,
        },
        {
          type: "follow" as const,
          title: "👥 Nuevo Seguidor",
          message: "Alguien comenzó a seguirte",
          priority: "medium" as const,
        },
        {
          type: "system" as const,
          title: "🔔 Notificación del Sistema",
          message: "Bienvenido al sistema de notificaciones",
          priority: "low" as const,
        },
        {
          type: "mention" as const,
          title: "📢 Te Mencionaron",
          message: "Alguien te mencionó en un comentario",
          priority: "high" as const,
        },
      ];

      const createdNotifications = [];

      for (const notificationData of testNotifications) {
        const notification = await NotificationService.createNotification({
          ...notificationData,
          toUserId: userId,
          metadata: {
            isTest: true,
            timestamp: new Date(),
          },
        });

        if (notification) {
          createdNotifications.push(notification);
        }
      }

      console.log(
        "✅ Notificaciones de prueba creadas:",
        createdNotifications.length
      );

      res.json({
        success: true,
        data: createdNotifications,
        message: `${createdNotifications.length} notificaciones de prueba creadas exitosamente`,
      });
    } catch (error) {
      console.error("❌ Error creando notificaciones de prueba:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }
}
