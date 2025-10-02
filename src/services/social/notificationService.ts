import { Types } from "mongoose";
import {
  NotificationModel,
  INotification,
  NotificationType,
  NotificationPriority,
} from "../../models/Social/Notification";
import {
  NotificationPreferencesModel,
  INotificationPreferences,
} from "../../models/Social/NotificationPreferences";
import { UserModel } from "../../models/Users";
import { PostModel } from "../../models/Social/Post";
import { CommentModel } from "../../models/Social/Comment";
import { getIO } from "../../socket/io";
import { pushNotificationService } from "../pushNotificationService";

// Configuración de límites para evitar spam
const NOTIFICATION_LIMITS = {
  likes: { maxPerHour: 10, minInterval: 300 }, // 5 min entre likes del mismo usuario
  comments: { maxPerHour: 5, minInterval: 600 }, // 10 min entre comentarios
  follows: { maxPerHour: 3, minInterval: 900 }, // 15 min entre follows
  mentions: { maxPerHour: 8, minInterval: 180 }, // 3 min entre menciones
  replies: { maxPerHour: 6, minInterval: 300 }, // 5 min entre respuestas
} as const;

export interface CreateNotificationParams {
  type: NotificationType;
  title: string;
  message: string;
  toUserId: Types.ObjectId;
  fromUserId?: Types.ObjectId;
  relatedPostId?: Types.ObjectId;
  relatedCommentId?: Types.ObjectId;
  actionUrl?: string;
  metadata?: Record<string, any>;
  priority?: NotificationPriority;
}

export interface NotificationStats {
  unreadCount: number;
  totalCount: number;
  todayCount: number;
  weekCount: number;
  lastSeenAt?: Date;
}

export class NotificationService {
  /**
   * Crear una nueva notificación con validaciones y throttling
   */
  static async createNotification(
    params: CreateNotificationParams
  ): Promise<INotification | null> {
    const {
      type,
      title,
      message,
      toUserId,
      fromUserId,
      relatedPostId,
      relatedCommentId,
      actionUrl,
      metadata = {},
      priority = "medium",
    } = params;

    try {
      // No crear notificaciones para uno mismo (excepto sistema)
      if (fromUserId && toUserId.equals(fromUserId) && type !== "system") {
        return null;
      }

      // Verificar preferencias del usuario
      if (fromUserId) {
        let preferences = await NotificationPreferencesModel.findOne({
          userId: toUserId,
        });
        if (!preferences) {
          // Crear preferencias por defecto con TODAS las notificaciones habilitadas
          preferences = await NotificationPreferencesModel.create({
            userId: toUserId,
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
            emailNotifications: false, // Solo email disabled por defecto
          });
          console.log(
            `✅ Preferencias creadas para usuario ${toUserId} - TODAS habilitadas`
          );
        }

        // Mapear tipos de notificación a campos de preferencias
        const preferenceFieldMap: {
          [key: string]: keyof INotificationPreferences;
        } = {
          like: "likes",
          comment: "comments",
          follow: "follows",
          mention: "mentions",
          reply: "replies",
          post_shared: "post_shared",
          comment_like: "comment_like",
          follow_request: "follow_requests",
          follow_accepted: "follow_requests",
          achievement: "achievements",
          system: "system",
        };

        // Obtener el campo correcto de preferencia
        const preferenceField = preferenceFieldMap[type] || type;
        const isEnabled =
          preferences[preferenceField as keyof typeof preferences];

        console.log(
          `🔍 Verificando preferencia "${type}" -> campo "${String(
            preferenceField
          )}" para usuario ${toUserId}: ${isEnabled}`
        );

        if (!isEnabled) {
          console.log(
            `🔕 Notificación ${type} bloqueada por preferencias del usuario ${toUserId}`
          );
          return null;
        }
      }

      // Aplicar throttling para evitar spam
      if (fromUserId && (await this.isThrottled(type, fromUserId, toUserId))) {
        console.log(
          `⏰ Notificación ${type} throttled para ${fromUserId} -> ${toUserId}`
        );
        return null;
      }

      // Crear la notificación
      const notification = await NotificationModel.create({
        type,
        title,
        message,
        fromUser: fromUserId,
        toUser: toUserId,
        relatedPost: relatedPostId,
        relatedComment: relatedCommentId,
        actionUrl,
        metadata,
        priority,
        isRead: false,
      });

      // Popular los datos relacionados para la respuesta completa
      await notification.populate([
        {
          path: "fromUser",
          select: "username displayName avatar isVerified",
        },
        {
          path: "relatedPost",
          select: "content images authorId",
          populate: {
            path: "authorId",
            select: "username name avatar",
          },
        },
        {
          path: "relatedComment",
          select: "content postId",
        },
      ]);

      // Emitir evento WebSocket en tiempo real
      this.emitNotificationToUser(toUserId.toString(), notification);

      // 🔔 NUEVA FUNCIONALIDAD: Enviar Push Notification
      await this.sendPushNotification(notification);

      console.log(
        `✅ Notificación ${type} creada: ${fromUserId} -> ${toUserId}`
      );
      return notification;
    } catch (error) {
      console.error(`❌ Error creando notificación:`, error);
      return null;
    }
  }

  /**
   * Verificar si una notificación debe ser throttled (limitada por tiempo/cantidad)
   */
  private static async isThrottled(
    type: NotificationType,
    fromUserId: Types.ObjectId,
    toUserId: Types.ObjectId
  ): Promise<boolean> {
    const limit = NOTIFICATION_LIMITS[type as keyof typeof NOTIFICATION_LIMITS];
    if (!limit) return false;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Verificar límite por hora
    const recentCount = await NotificationModel.countDocuments({
      type,
      fromUser: fromUserId,
      toUser: toUserId,
      createdAt: { $gte: oneHourAgo },
    });

    if (recentCount >= limit.maxPerHour) {
      return true;
    }

    // Verificar intervalo mínimo
    const lastNotification = await NotificationModel.findOne({
      type,
      fromUser: fromUserId,
      toUser: toUserId,
    }).sort({ createdAt: -1 });

    if (lastNotification) {
      const timeSinceLastMs = Date.now() - lastNotification.createdAt.getTime();
      if (timeSinceLastMs < limit.minInterval * 1000) {
        return true;
      }
    }

    return false;
  }

  /**
   * Manejar like en un post
   */
  static async handlePostLike(
    postId: Types.ObjectId,
    likedByUserId: Types.ObjectId
  ) {
    try {
      console.log(
        `🔍 handlePostLike iniciado - Post: ${postId}, Liker: ${likedByUserId}`
      );

      const post = await PostModel.findById(postId);
      if (!post) {
        console.log(`❌ Post ${postId} no encontrado`);
        return;
      }

      console.log(`✅ Post encontrado - Autor: ${post.authorId}`);

      const liker = await UserModel.findById(likedByUserId).select(
        "username name avatar"
      );
      if (!liker) {
        console.log(`❌ Usuario liker ${likedByUserId} no encontrado`);
        return;
      }

      console.log(`✅ Liker encontrado - ${liker.name || liker.username}`);

      // Verificar si es el mismo usuario
      if (post.authorId.toString() === likedByUserId.toString()) {
        console.log(
          `🚫 No crear notificación: el usuario dio like a su propio post`
        );
        return;
      }

      console.log(
        `📝 Creando notificación: ${liker.name} le dio like al post de ${post.authorId}`
      );

      const notification = await this.createNotification({
        type: "like",
        title: "Nuevo like",
        message: `A ${liker.name || liker.username} le gustó tu publicación`,
        toUserId: post.authorId,
        fromUserId: likedByUserId,
        relatedPostId: postId,
        actionUrl: `/SER?post=${postId}`,
        priority: "medium",
        metadata: {
          postContent: post.content.substring(0, 100),
          likerUsername: liker.username,
        },
      });

      if (notification) {
        console.log(
          `✅ Notificación de like creada exitosamente:`,
          notification._id
        );
      } else {
        console.log(
          `⚠️ Notificación de like no fue creada (throttle o preferencias)`
        );
      }
    } catch (error) {
      console.error("❌ Error en handlePostLike:", error);
    }
  }

  /**
   * Manejar nuevo comentario en un post
   */
  static async handleNewComment(
    postId: Types.ObjectId,
    commentId: Types.ObjectId,
    authorId: Types.ObjectId
  ) {
    try {
      const [post, comment, commenter] = await Promise.all([
        PostModel.findById(postId),
        CommentModel.findById(commentId),
        UserModel.findById(authorId).select("username name avatar"),
      ]);

      if (!post || !comment || !commenter) return;

      await this.createNotification({
        type: "comment",
        title: "Nuevo comentario",
        message: `${
          commenter.name || commenter.username
        } comentó en tu publicación`,
        toUserId: post.authorId,
        fromUserId: authorId,
        relatedPostId: postId,
        relatedCommentId: commentId,
        actionUrl: `/SER?post=${postId}&comment=${commentId}`,
        priority: "high",
        metadata: {
          postContent: post.content.substring(0, 100),
          commentContent: comment.content.substring(0, 100),
          commenterUsername: commenter.username,
        },
      });
    } catch (error) {
      console.error("❌ Error en handleNewComment:", error);
    }
  }

  /**
   * Manejar nuevo seguidor
   */
  static async handleNewFollow(
    followerId: Types.ObjectId,
    followedId: Types.ObjectId
  ) {
    try {
      const follower = await UserModel.findById(followerId).select(
        "username name avatar"
      );
      if (!follower) return;

      await this.createNotification({
        type: "follow",
        title: "Nuevo seguidor",
        message: `${follower.name || follower.username} comenzó a seguirte`,
        toUserId: followedId,
        fromUserId: followerId,
        actionUrl: `/SER?user=${followerId}`,
        priority: "medium",
        metadata: {
          followerUsername: follower.username,
        },
      });
    } catch (error) {
      console.error("❌ Error en handleNewFollow:", error);
    }
  }

  /**
   * Manejar menciones (@username) en comentarios
   */
  static async handleMention(
    commentId: Types.ObjectId,
    mentionedUserIds: Types.ObjectId[],
    authorId: Types.ObjectId
  ) {
    try {
      const [comment, author] = await Promise.all([
        CommentModel.findById(commentId),
        UserModel.findById(authorId).select("username name avatar"),
      ]);

      if (!comment || !author) return;

      for (const mentionedUserId of mentionedUserIds) {
        if (mentionedUserId.equals(authorId)) continue; // No auto-mencionar

        await this.createNotification({
          type: "mention",
          title: "Te mencionaron",
          message: `${
            author.name || author.username
          } te mencionó en un comentario`,
          toUserId: mentionedUserId,
          fromUserId: authorId,
          relatedPostId: comment.postId,
          relatedCommentId: commentId,
          actionUrl: `/SER?post=${comment.postId}&comment=${commentId}`,
          priority: "high",
          metadata: {
            commentContent: comment.content.substring(0, 100),
            authorUsername: author.username,
          },
        });
      }
    } catch (error) {
      console.error("❌ Error en handleMention:", error);
    }
  }

  /**
   * Obtener notificaciones de un usuario con paginación
   */
  static async getUserNotifications(
    userId: Types.ObjectId,
    options: {
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
      type?: NotificationType;
      priority?: NotificationPriority;
    } = {}
  ) {
    const {
      page = 1,
      limit = 20,
      unreadOnly = false,
      type,
      priority,
    } = options;

    const skip = (page - 1) * limit;
    const query: any = { toUser: userId };

    if (unreadOnly) query.isRead = false;
    if (type) query.type = type;
    if (priority) query.priority = priority;

    const [notifications, total] = await Promise.all([
      NotificationModel.find(query)
        .populate([
          {
            path: "fromUser",
            select: "username displayName avatar isVerified",
          },
          {
            path: "relatedPost",
            select: "content images authorId",
            populate: {
              path: "authorId",
              select: "username name avatar",
            },
          },
          {
            path: "relatedComment",
            select: "content postId",
          },
        ])
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      NotificationModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Obtener estadísticas de notificaciones
   */
  static async getNotificationStats(
    userId: Types.ObjectId
  ): Promise<NotificationStats> {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [unreadCount, totalCount, todayCount, weekCount] = await Promise.all([
      NotificationModel.countDocuments({ toUser: userId, isRead: false }),
      NotificationModel.countDocuments({ toUser: userId }),
      NotificationModel.countDocuments({
        toUser: userId,
        createdAt: { $gte: todayStart },
      }),
      NotificationModel.countDocuments({
        toUser: userId,
        createdAt: { $gte: weekStart },
      }),
    ]);

    // TODO: Implementar lastSeenAt desde el modelo de usuario
    return {
      unreadCount,
      totalCount,
      todayCount,
      weekCount,
    };
  }

  /**
   * Marcar notificación como leída
   */
  static async markAsRead(
    notificationId: Types.ObjectId,
    userId: Types.ObjectId
  ): Promise<boolean> {
    try {
      const result = await NotificationModel.updateOne(
        { _id: notificationId, toUser: userId },
        { isRead: true, updatedAt: new Date() }
      );

      if (result.modifiedCount > 0) {
        // Emitir evento WebSocket
        this.emitNotificationRead(userId.toString(), notificationId.toString());
        return true;
      }

      return false;
    } catch (error) {
      console.error("❌ Error marcando notificación como leída:", error);
      return false;
    }
  }

  /**
   * Marcar todas las notificaciones como leídas
   */
  static async markAllAsRead(userId: Types.ObjectId): Promise<number> {
    try {
      const result = await NotificationModel.updateMany(
        { toUser: userId, isRead: false },
        { isRead: true, updatedAt: new Date() }
      );

      if (result.modifiedCount > 0) {
        // Emitir evento WebSocket
        this.emitNotificationsCleared(userId.toString(), result.modifiedCount);
      }

      return result.modifiedCount;
    } catch (error) {
      console.error(
        "❌ Error marcando todas las notificaciones como leídas:",
        error
      );
      return 0;
    }
  }

  /**
   * Eliminar una notificación
   */
  static async deleteNotification(
    notificationId: Types.ObjectId,
    userId: Types.ObjectId
  ): Promise<boolean> {
    try {
      const result = await NotificationModel.deleteOne({
        _id: notificationId,
        toUser: userId,
      });

      return result.deletedCount > 0;
    } catch (error) {
      console.error("❌ Error eliminando notificación:", error);
      return false;
    }
  }

  /**
   * Extraer menciones (@username) de un texto
   */
  static extractMentions(text: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }

    return mentions;
  }

  /**
   * Resolver usernames a ObjectIds
   */
  static async resolveUsernames(
    usernames: string[]
  ): Promise<Types.ObjectId[]> {
    try {
      const users = await UserModel.find({
        username: { $in: usernames },
      }).select("_id");

      return users.map((user: any) => user._id as Types.ObjectId);
    } catch (error) {
      console.error("❌ Error resolviendo usernames:", error);
      return [];
    }
  }

  // ============ PUSH NOTIFICATIONS ============

  /**
   * 🔔 Enviar Push Notification
   * Integración con el servicio de push notifications
   */
  private static async sendPushNotification(
    notification: INotification
  ): Promise<void> {
    try {
      // Verificar que el servicio de push esté disponible
      if (!pushNotificationService) {
        console.log("⚠️ Push notification service no disponible");
        return;
      }

      const toUserId = notification.toUser?.toString();
      if (!toUserId) {
        console.log("⚠️ No se puede enviar push: toUser no definido");
        return;
      }

      // Obtener información del usuario que envía (si existe)
      let fromUserInfo = null;
      if (notification.fromUser) {
        fromUserInfo = await UserModel.findById(notification.fromUser).select(
          "name username"
        );
      }

      // Crear el payload de la push notification basado en el tipo
      const pushPayload = this.createPushPayload(notification, fromUserInfo);

      // Enviar la push notification
      const success = await pushNotificationService.sendToUser(
        toUserId,
        pushPayload
      );

      if (success) {
        console.log(
          `📤 Push notification enviada para tipo: ${notification.type}`
        );
      } else {
        console.log(
          `📵 Push notification no enviada (usuario offline o sin suscripciones)`
        );
      }
    } catch (error) {
      console.error("❌ Error enviando push notification:", error);
    }
  }

  /**
   * 📝 Crear payload de push notification basado en el tipo de notificación
   */
  private static createPushPayload(
    notification: INotification,
    fromUserInfo: any
  ): any {
    const basePayload = {
      title: "AIMNK Comunidad",
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      tag: `${notification.type}_${notification._id}`,
      data: {
        type: notification.type,
        notificationId: notification._id.toString(),
        actionUrl: notification.actionUrl || "/SER",
      },
      actions: [
        {
          action: "view",
          title: "Ver",
        },
      ],
    };

    // Personalizar mensaje según el tipo de notificación
    switch (notification.type) {
      case "like":
        return {
          ...basePayload,
          title: "👍 Nuevo Me Gusta",
          body: fromUserInfo
            ? `A ${fromUserInfo.name} le gustó tu publicación`
            : "Alguien dio me gusta a tu publicación",
          data: {
            ...basePayload.data,
            actionUrl: notification.actionUrl || "/SER",
          },
        };

      case "comment":
        return {
          ...basePayload,
          title: "💬 Nuevo Comentario",
          body: fromUserInfo
            ? `${fromUserInfo.name} comentó tu publicación`
            : "Alguien comentó tu publicación",
          data: {
            ...basePayload.data,
            actionUrl: notification.actionUrl || "/SER",
          },
        };

      case "follow":
        return {
          ...basePayload,
          title: "👥 Nuevo Seguidor",
          body: fromUserInfo
            ? `${fromUserInfo.name} comenzó a seguirte`
            : "Tienes un nuevo seguidor",
          data: {
            ...basePayload.data,
            actionUrl: `/SER?user=${fromUserInfo?.username || ""}`,
          },
        };

      case "mention":
        return {
          ...basePayload,
          title: "📢 Te Mencionaron",
          body: fromUserInfo
            ? `${fromUserInfo.name} te mencionó en un comentario`
            : "Alguien te mencionó",
          data: {
            ...basePayload.data,
            actionUrl: notification.actionUrl || "/SER",
          },
        };

      case "reply":
        return {
          ...basePayload,
          title: "↩️ Nueva Respuesta",
          body: fromUserInfo
            ? `${fromUserInfo.name} respondió a tu comentario`
            : "Alguien respondió a tu comentario",
          data: {
            ...basePayload.data,
            actionUrl: notification.actionUrl || "/SER",
          },
        };

      case "system":
        return {
          ...basePayload,
          title: "🔔 Notificación del Sistema",
          body: notification.message || "Tienes una nueva notificación",
          data: {
            ...basePayload.data,
            actionUrl: notification.actionUrl || "/SER",
          },
        };

      default:
        return {
          ...basePayload,
          title: "🔔 Nueva Notificación",
          body: notification.message || "Tienes una nueva notificación",
          data: {
            ...basePayload.data,
            actionUrl: notification.actionUrl || "/SER",
          },
        };
    }
  }

  // ============ EVENTOS WEBSOCKET ============

  /**
   * Emitir nueva notificación a un usuario específico
   */
  private static emitNotificationToUser(
    userId: string,
    notification: INotification
  ) {
    const io = getIO();
    if (io) {
      io.to(`user-${userId}`).emit("new-notification", notification);
      console.log(`📡 Notificación emitida vía WebSocket: user-${userId}`);
    }
  }

  /**
   * Emitir que una notificación fue marcada como leída
   */
  private static emitNotificationRead(userId: string, notificationId: string) {
    const io = getIO();
    if (io) {
      io.to(`user-${userId}`).emit("notification-read", {
        notificationId,
        userId,
      });
    }
  }

  /**
   * Emitir que todas las notificaciones fueron marcadas como leídas
   */
  private static emitNotificationsCleared(userId: string, count: number) {
    const io = getIO();
    if (io) {
      io.to(`user-${userId}`).emit("notifications-cleared", {
        userId,
        count,
      });
    }
  }

  // ============ MÉTODOS LEGACY PARA COMPATIBILIDAD ============

  /**
   * @deprecated Usar createNotification en su lugar
   */
  async create(params: {
    type: "like" | "comment" | "follow" | "mention";
    message: string;
    fromUserId: string;
    toUserId: string;
    postId?: string;
    commentId?: string;
  }) {
    console.warn("⚠️  Método create() deprecated, usar createNotification()");
    return NotificationModel.create({
      type: params.type,
      title: `Notificación: ${params.type}`,
      message: params.message,
      fromUser: new Types.ObjectId(params.fromUserId),
      toUser: new Types.ObjectId(params.toUserId),
      relatedPost: params.postId
        ? new Types.ObjectId(params.postId)
        : undefined,
      relatedComment: params.commentId
        ? new Types.ObjectId(params.commentId)
        : undefined,
    });
  }

  /**
   * @deprecated Usar getUserNotifications en su lugar
   */
  async list(toUserId: string, page = 1, limit = 20) {
    console.warn("⚠️  Método list() deprecated, usar getUserNotifications()");
    const skip = (page - 1) * limit;
    const items = await NotificationModel.find({ toUser: toUserId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await NotificationModel.countDocuments({ toUser: toUserId });
    return { items, page, limit, total };
  }

  /**
   * @deprecated Usar markAsRead en su lugar
   */
  async markRead(id: string) {
    console.warn("⚠️  Método markRead() deprecated, usar markAsRead()");
    await NotificationModel.findByIdAndUpdate(id, { isRead: true });
    return { ok: true };
  }

  /**
   * @deprecated Usar markAllAsRead en su lugar
   */
  async markAllRead(toUserId: string) {
    console.warn("⚠️  Método markAllRead() deprecated, usar markAllAsRead()");
    await NotificationModel.updateMany(
      { toUser: toUserId, isRead: false },
      { $set: { isRead: true } }
    );
    return { ok: true };
  }
}

// Función para limpiar notificaciones antiguas (ejecutar diariamente con cron)
export const cleanupOldNotifications = async () => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);

  const result = await NotificationModel.deleteMany({
    createdAt: { $lt: cutoffDate },
    isRead: true,
  });

  console.log(
    `🗑️ Limpieza automática: ${result.deletedCount} notificaciones eliminadas`
  );
  return result;
};
