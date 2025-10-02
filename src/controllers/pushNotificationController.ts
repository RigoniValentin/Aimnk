import { Request, Response } from "express";
import { pushNotificationService } from "../services/pushNotificationService";

class PushNotificationController {
  /**
   * POST /api/push/subscribe
   * Registrar un dispositivo para push notifications
   */
  subscribe = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).currentUser?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Usuario no autenticado",
        });
        return;
      }

      const { subscription } = req.body;

      if (!subscription || !subscription.endpoint || !subscription.keys) {
        res.status(400).json({
          success: false,
          message: "Datos de suscripción inválidos",
        });
        return;
      }

      const userAgent = req.get("User-Agent") || "";

      console.log(`🔔 Nueva suscripción push para usuario: ${userId}`);

      const pushSubscription = await pushNotificationService.subscribe(
        userId,
        subscription,
        userAgent
      );

      res.status(201).json({
        success: true,
        message: "Suscripción registrada exitosamente",
        data: {
          id: pushSubscription._id,
          endpoint: pushSubscription.endpoint.substring(0, 50) + "...",
          isActive: pushSubscription.isActive,
        },
      });
    } catch (error: any) {
      console.error("❌ Error en subscribe:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: error.message,
      });
    }
  };

  /**
   * DELETE /api/push/unsubscribe
   * Desregistrar un dispositivo de push notifications
   */
  unsubscribe = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).currentUser?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Usuario no autenticado",
        });
        return;
      }

      const { endpoint } = req.body;

      if (!endpoint) {
        res.status(400).json({
          success: false,
          message: "Endpoint requerido",
        });
        return;
      }

      console.log(`🔕 Desregistrando suscripción push para usuario: ${userId}`);

      const result = await pushNotificationService.unsubscribe(
        userId,
        endpoint
      );

      if (result) {
        res.json({
          success: true,
          message: "Suscripción desregistrada exitosamente",
        });
      } else {
        res.status(404).json({
          success: false,
          message: "Suscripción no encontrada",
        });
      }
    } catch (error: any) {
      console.error("❌ Error en unsubscribe:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: error.message,
      });
    }
  };

  /**
   * GET /api/push/subscriptions
   * Obtener todas las suscripciones del usuario
   */
  getSubscriptions = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).currentUser?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Usuario no autenticado",
        });
        return;
      }

      console.log(`📋 Obteniendo suscripciones para usuario: ${userId}`);

      const subscriptions = await pushNotificationService.getUserSubscriptions(
        userId
      );

      const formattedSubscriptions = subscriptions.map((sub) => ({
        id: sub._id,
        endpoint: sub.endpoint.substring(0, 50) + "...",
        userAgent: sub.userAgent,
        isActive: sub.isActive,
        lastUsed: sub.lastUsed,
        createdAt: sub.createdAt,
      }));

      res.json({
        success: true,
        data: formattedSubscriptions,
        count: formattedSubscriptions.length,
      });
    } catch (error: any) {
      console.error("❌ Error en getSubscriptions:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: error.message,
      });
    }
  };

  /**
   * POST /api/push/test
   * Enviar notificación de prueba
   */
  sendTest = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).currentUser?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Usuario no autenticado",
        });
        return;
      }

      console.log(`🧪 Enviando notificación de prueba a usuario: ${userId}`);

      const result = await pushNotificationService.sendTestNotification(userId);

      if (result) {
        res.json({
          success: true,
          message: "Notificación de prueba enviada exitosamente",
        });
      } else {
        res.status(400).json({
          success: false,
          message:
            "No se pudo enviar la notificación de prueba. Verifica que tengas suscripciones activas.",
        });
      }
    } catch (error: any) {
      console.error("❌ Error en sendTest:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: error.message,
      });
    }
  };

  /**
   * GET /api/push/stats
   * Obtener estadísticas de push notifications
   */
  getStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).currentUser?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Usuario no autenticado",
        });
        return;
      }

      console.log(`📊 Obteniendo estadísticas de push notifications`);

      const stats = await pushNotificationService.getStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error("❌ Error en getStats:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: error.message,
      });
    }
  };

  /**
   * POST /api/push/send
   * Enviar push notification personalizada
   */
  sendCustom = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).currentUser?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Usuario no autenticado",
        });
        return;
      }

      const { title, body, targetUserId, type, actionUrl } = req.body;

      if (!title || !body) {
        res.status(400).json({
          success: false,
          message: "Título y cuerpo son requeridos",
        });
        return;
      }

      const targetId = targetUserId || userId;

      console.log(
        `📤 Enviando push notification personalizada a usuario: ${targetId}`
      );

      const payload = {
        title,
        body,
        data: {
          type: type || "custom",
          userId: targetId,
          actionUrl: actionUrl || "/SER",
        },
      };

      const result = await pushNotificationService.sendToUser(
        targetId,
        payload
      );

      if (result) {
        res.json({
          success: true,
          message: "Notificación enviada exitosamente",
        });
      } else {
        res.status(400).json({
          success: false,
          message: "No se pudo enviar la notificación",
        });
      }
    } catch (error: any) {
      console.error("❌ Error en sendCustom:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: error.message,
      });
    }
  };

  /**
   * POST /api/push/cleanup
   * Limpiar suscripciones inactivas
   */
  cleanup = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).currentUser?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Usuario no autenticado",
        });
        return;
      }

      console.log(`🧹 Iniciando limpieza de suscripciones inactivas`);

      const deletedCount = await pushNotificationService.cleanupSubscriptions();

      res.json({
        success: true,
        message: `Limpieza completada. ${deletedCount} suscripciones eliminadas.`,
        deletedCount,
      });
    } catch (error: any) {
      console.error("❌ Error en cleanup:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: error.message,
      });
    }
  };

  /**
   * GET /api/push/vapid-key
   * Obtener la clave pública VAPID para el frontend
   */
  getVapidKey = async (req: Request, res: Response): Promise<void> => {
    try {
      const publicKey = process.env.VAPID_PUBLIC_KEY;

      if (!publicKey) {
        res.status(500).json({
          success: false,
          message: "Clave VAPID no configurada",
        });
        return;
      }

      res.json({
        success: true,
        data: {
          publicKey,
        },
      });
    } catch (error: any) {
      console.error("❌ Error en getVapidKey:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: error.message,
      });
    }
  };
}

export const pushNotificationController = new PushNotificationController();
