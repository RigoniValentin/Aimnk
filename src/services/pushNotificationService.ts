import webPush from "web-push";
import {
  PushSubscription,
  IPushSubscription,
} from "../models/PushSubscription";
import { UserModel } from "../models/Users";
import {
  NotificationPreferencesModel,
  INotificationPreferences,
} from "../models/Social/NotificationPreferences";
import { getIO } from "../socket/io";

// Configuración de VAPID - se inicializa después
let vapidConfigured = false;

const initializeVapid = () => {
  if (!vapidConfigured) {
    console.log("🔑 Inicializando configuración VAPID...");

    const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@aimnk.com";
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("❌ VAPID keys no encontradas en variables de entorno");
      throw new Error("VAPID keys no configuradas");
    }

    webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    vapidConfigured = true;
    console.log("✅ VAPID configurado correctamente");
  }
};

interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    type: string;
    userId?: string;
    postId?: string;
    actionUrl?: string;
    [key: string]: any;
  };
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
}

class PushNotificationService {
  private readonly maxRetries = 3;
  private readonly defaultIcon = "/icon-192.png";
  private readonly defaultBadge = "/badge-72.png";

  /**
   * Registrar una nueva push subscription
   */
  async subscribe(
    userId: string,
    subscription: any,
    userAgent?: string
  ): Promise<IPushSubscription> {
    try {
      // Inicializar VAPID si es necesario
      initializeVapid();

      console.log(`🔔 Registrando push subscription para usuario: ${userId}`);

      // Buscar suscripción existente por endpoint
      const existingSubscription = await PushSubscription.findOne({
        endpoint: subscription.endpoint,
      });

      if (existingSubscription) {
        // Actualizar suscripción existente
        existingSubscription.userId = userId;
        existingSubscription.keys = subscription.keys;
        existingSubscription.userAgent =
          userAgent || existingSubscription.userAgent;
        existingSubscription.isActive = true;
        existingSubscription.lastUsed = new Date();

        console.log(
          `✅ Push subscription actualizada: ${existingSubscription._id}`
        );
        return await existingSubscription.save();
      }

      // Crear nueva suscripción
      const newSubscription = new PushSubscription({
        userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userAgent,
        isActive: true,
        lastUsed: new Date(),
      });

      const saved = await newSubscription.save();
      console.log(`✅ Nueva push subscription creada: ${saved._id}`);

      return saved;
    } catch (error) {
      console.error("❌ Error registrando push subscription:", error);
      throw new Error("Error registrando push subscription");
    }
  }

  /**
   * Desregistrar una push subscription
   */
  async unsubscribe(userId: string, endpoint: string): Promise<boolean> {
    try {
      console.log(
        `🔕 Desregistrando push subscription para usuario: ${userId}`
      );

      const result = await PushSubscription.findOneAndUpdate(
        { userId, endpoint },
        { isActive: false },
        { new: true }
      );

      if (result) {
        console.log(`✅ Push subscription desactivada: ${result._id}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error("❌ Error desregistrando push subscription:", error);
      throw new Error("Error desregistrando push subscription");
    }
  }

  /**
   * Obtener todas las suscripciones activas de un usuario
   */
  async getUserSubscriptions(userId: string): Promise<IPushSubscription[]> {
    try {
      return await PushSubscription.find({
        userId,
        isActive: true,
      });
    } catch (error) {
      console.error("❌ Error obteniendo suscripciones:", error);
      return [];
    }
  }

  /**
   * Enviar push notification a un usuario específico
   */
  async sendToUser(
    userId: string,
    payload: PushNotificationPayload
  ): Promise<boolean> {
    try {
      console.log(`📤 Enviando push notification a usuario: ${userId}`);
      console.log(`📝 Payload:`, payload);

      // Verificar si las push notifications están habilitadas
      if (process.env.PUSH_NOTIFICATIONS_ENABLED !== "true") {
        console.log("⏸️ Push notifications deshabilitadas en entorno");
        return false;
      }

      // Verificar si el usuario está online (usando Socket.IO)
      const io = getIO();
      const isUserOnline = io
        ? io.sockets.adapter.rooms.has(`user-${userId}`)
        : false;
      if (isUserOnline) {
        console.log(
          `👤 Usuario ${userId} está online, no enviando push notification`
        );
        return true; // Consideramos como éxito porque el usuario ya recibió la notificación via WebSocket
      }

      // Verificar preferencias del usuario
      const canSendPush = await this.checkUserPreferences(
        userId,
        payload.data?.type || "default"
      );
      if (!canSendPush) {
        console.log(
          `🚫 Usuario ${userId} tiene push notifications deshabilitadas para tipo: ${payload.data?.type}`
        );
        return false;
      }

      // Obtener suscripciones activas del usuario
      const subscriptions = await this.getUserSubscriptions(userId);

      if (subscriptions.length === 0) {
        console.log(`📵 No hay suscripciones activas para usuario: ${userId}`);
        return false;
      }

      // Preparar payload final
      const finalPayload = this.preparePayload(payload);

      // Enviar a todas las suscripciones del usuario
      const results = await Promise.allSettled(
        subscriptions.map((subscription) =>
          this.sendToSubscription(subscription, finalPayload)
        )
      );

      // Procesar resultados
      const successful = results.filter(
        (result) => result.status === "fulfilled"
      ).length;
      const failed = results.filter(
        (result) => result.status === "rejected"
      ).length;

      console.log(
        `📊 Push notification enviada - Exitosas: ${successful}, Fallidas: ${failed}`
      );

      return successful > 0;
    } catch (error) {
      console.error("❌ Error enviando push notification:", error);
      return false;
    }
  }

  /**
   * Enviar push notification a múltiples usuarios
   */
  async sendToUsers(
    userIds: string[],
    payload: PushNotificationPayload
  ): Promise<{ successful: number; failed: number }> {
    console.log(
      `📤 Enviando push notification masiva a ${userIds.length} usuarios`
    );

    const results = await Promise.allSettled(
      userIds.map((userId) => this.sendToUser(userId, payload))
    );

    const successful = results.filter(
      (result) => result.status === "fulfilled" && result.value === true
    ).length;

    const failed = results.length - successful;

    console.log(
      `📊 Push notification masiva completada - Exitosas: ${successful}, Fallidas: ${failed}`
    );

    return { successful, failed };
  }

  /**
   * Enviar push notification a una suscripción específica
   */
  private async sendToSubscription(
    subscription: IPushSubscription,
    payload: string,
    retryCount = 0
  ): Promise<boolean> {
    try {
      // Inicializar VAPID si es necesario
      initializeVapid();

      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      };

      const options = {
        TTL: 24 * 60 * 60, // 24 horas
        urgency: "normal" as const,
        headers: {},
      };

      await webPush.sendNotification(pushSubscription, payload, options);

      // Marcar suscripción como usada
      await subscription.markAsUsed();

      console.log(
        `✅ Push notification enviada exitosamente a: ${subscription.endpoint.substring(
          0,
          50
        )}...`
      );
      return true;
    } catch (error: any) {
      console.error(`❌ Error enviando push notification:`, error);

      // Manejar errores específicos
      if (error.statusCode === 410 || error.statusCode === 404) {
        // Suscripción expirada o inválida
        console.log(
          `🗑️ Desactivando suscripción inválida: ${subscription.endpoint.substring(
            0,
            50
          )}...`
        );
        await subscription.deactivate();
        return false;
      }

      // Reintentar en caso de errores temporales
      if (
        retryCount < this.maxRetries &&
        (error.statusCode >= 500 || error.code === "ENOTFOUND")
      ) {
        console.log(
          `🔄 Reintentando push notification (${retryCount + 1}/${
            this.maxRetries
          })`
        );
        await this.delay(1000 * (retryCount + 1)); // Backoff exponencial
        return this.sendToSubscription(subscription, payload, retryCount + 1);
      }

      return false;
    }
  }

  /**
   * Verificar preferencias de usuario para push notifications
   */
  private async checkUserPreferences(
    userId: string,
    notificationType: string
  ): Promise<boolean> {
    try {
      const preferences = await NotificationPreferencesModel.findOne({
        userId,
      });

      if (!preferences) {
        return true; // Si no hay preferencias, permitir por defecto
      }

      // Verificar si las push notifications están habilitadas globalmente
      if (!preferences.pushNotifications) {
        return false;
      }

      // Verificar preferencias específicas por tipo
      switch (notificationType) {
        case "like":
          return preferences.likes;
        case "comment":
          return preferences.comments;
        case "follow":
          return preferences.follows;
        case "mention":
          return preferences.mentions;
        case "message":
          return preferences.replies; // Asumiendo que mensajes usan el campo replies
        default:
          return true;
      }
    } catch (error) {
      console.error("❌ Error verificando preferencias:", error);
      return true; // En caso de error, permitir por defecto
    }
  }

  /**
   * Preparar payload final con valores por defecto
   */
  private preparePayload(payload: PushNotificationPayload): string {
    const finalPayload = {
      title: payload.title || "AIMNK Comunidad",
      body: payload.body,
      icon: payload.icon || this.defaultIcon,
      badge: payload.badge || this.defaultBadge,
      tag: payload.tag,
      data: payload.data || {},
      actions: payload.actions || [],
      requireInteraction: payload.requireInteraction || false,
      silent: payload.silent || false,
      timestamp: payload.timestamp || Date.now(),
    };

    return JSON.stringify(finalPayload);
  }

  /**
   * Utility para delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Limpiar suscripciones inactivas/expiradas
   */
  async cleanupSubscriptions(): Promise<number> {
    try {
      console.log("🧹 Iniciando limpieza de suscripciones inactivas");

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await PushSubscription.deleteMany({
        $or: [
          { isActive: false, updatedAt: { $lt: thirtyDaysAgo } },
          { lastUsed: { $lt: thirtyDaysAgo } },
        ],
      });

      console.log(
        `🗑️ Eliminadas ${result.deletedCount} suscripciones inactivas`
      );
      return result.deletedCount || 0;
    } catch (error) {
      console.error("❌ Error limpiando suscripciones:", error);
      return 0;
    }
  }

  /**
   * Enviar notificación de prueba
   */
  async sendTestNotification(userId: string): Promise<boolean> {
    const payload: PushNotificationPayload = {
      title: "🔔 AIMNK Test",
      body: "Esta es una notificación de prueba. ¡Todo funciona correctamente!",
      icon: this.defaultIcon,
      badge: this.defaultBadge,
      tag: "test_notification",
      data: {
        type: "test",
        userId,
        actionUrl: "/SER",
      },
      actions: [
        {
          action: "view",
          title: "Ver comunidad",
        },
      ],
    };

    return this.sendToUser(userId, payload);
  }

  /**
   * Obtener estadísticas de push notifications
   */
  async getStats(): Promise<{
    totalSubscriptions: number;
    activeSubscriptions: number;
    inactiveSubscriptions: number;
    subscriptionsByUser: number;
  }> {
    try {
      const [total, active, inactive, byUser] = await Promise.all([
        PushSubscription.countDocuments({}),
        PushSubscription.countDocuments({ isActive: true }),
        PushSubscription.countDocuments({ isActive: false }),
        PushSubscription.distinct("userId", { isActive: true }).then(
          (users) => users.length
        ),
      ]);

      return {
        totalSubscriptions: total,
        activeSubscriptions: active,
        inactiveSubscriptions: inactive,
        subscriptionsByUser: byUser,
      };
    } catch (error) {
      console.error("❌ Error obteniendo estadísticas:", error);
      return {
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        inactiveSubscriptions: 0,
        subscriptionsByUser: 0,
      };
    }
  }
}

export const pushNotificationService = new PushNotificationService();
