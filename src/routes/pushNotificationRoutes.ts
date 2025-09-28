import { Router } from "express";
import { pushNotificationController } from "../controllers/pushNotificationController";
import { verifyToken } from "../middlewares/auth";

const router = Router();

/**
 * @swagger
 * /api/push/vapid-key:
 *   get:
 *     summary: Obtener clave pública VAPID
 *     tags: [Push Notifications]
 *     responses:
 *       200:
 *         description: Clave pública VAPID obtenida exitosamente
 *       500:
 *         description: Error interno del servidor
 */
router.get("/vapid-key", pushNotificationController.getVapidKey);

/**
 * @swagger
 * /api/push/subscribe:
 *   post:
 *     summary: Registrar dispositivo para push notifications
 *     tags: [Push Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subscription
 *             properties:
 *               subscription:
 *                 type: object
 *                 properties:
 *                   endpoint:
 *                     type: string
 *                   keys:
 *                     type: object
 *                     properties:
 *                       p256dh:
 *                         type: string
 *                       auth:
 *                         type: string
 *     responses:
 *       201:
 *         description: Suscripción registrada exitosamente
 *       400:
 *         description: Datos de suscripción inválidos
 *       401:
 *         description: Usuario no autenticado
 *       500:
 *         description: Error interno del servidor
 */
router.post("/subscribe", verifyToken, pushNotificationController.subscribe);

/**
 * @swagger
 * /api/push/unsubscribe:
 *   delete:
 *     summary: Desregistrar dispositivo de push notifications
 *     tags: [Push Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - endpoint
 *             properties:
 *               endpoint:
 *                 type: string
 *     responses:
 *       200:
 *         description: Suscripción desregistrada exitosamente
 *       404:
 *         description: Suscripción no encontrada
 *       401:
 *         description: Usuario no autenticado
 *       500:
 *         description: Error interno del servidor
 */
router.delete(
  "/unsubscribe",
  verifyToken,
  pushNotificationController.unsubscribe
);

/**
 * @swagger
 * /api/push/subscriptions:
 *   get:
 *     summary: Obtener suscripciones del usuario
 *     tags: [Push Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Suscripciones obtenidas exitosamente
 *       401:
 *         description: Usuario no autenticado
 *       500:
 *         description: Error interno del servidor
 */
router.get(
  "/subscriptions",
  verifyToken,
  pushNotificationController.getSubscriptions
);

/**
 * @swagger
 * /api/push/test:
 *   post:
 *     summary: Enviar notificación de prueba
 *     tags: [Push Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notificación de prueba enviada
 *       400:
 *         description: No se pudo enviar la notificación
 *       401:
 *         description: Usuario no autenticado
 *       500:
 *         description: Error interno del servidor
 */
router.post("/test", verifyToken, pushNotificationController.sendTest);

/**
 * @swagger
 * /api/push/send:
 *   post:
 *     summary: Enviar push notification personalizada
 *     tags: [Push Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - body
 *             properties:
 *               title:
 *                 type: string
 *               body:
 *                 type: string
 *               targetUserId:
 *                 type: string
 *               type:
 *                 type: string
 *               actionUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Notificación enviada exitosamente
 *       400:
 *         description: Datos inválidos o no se pudo enviar
 *       401:
 *         description: Usuario no autenticado
 *       500:
 *         description: Error interno del servidor
 */
router.post("/send", verifyToken, pushNotificationController.sendCustom);

/**
 * @swagger
 * /api/push/stats:
 *   get:
 *     summary: Obtener estadísticas de push notifications
 *     tags: [Push Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *       401:
 *         description: Usuario no autenticado
 *       500:
 *         description: Error interno del servidor
 */
router.get("/stats", verifyToken, pushNotificationController.getStats);

/**
 * @swagger
 * /api/push/cleanup:
 *   post:
 *     summary: Limpiar suscripciones inactivas
 *     tags: [Push Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Limpieza completada
 *       401:
 *         description: Usuario no autenticado
 *       500:
 *         description: Error interno del servidor
 */
router.post("/cleanup", verifyToken, pushNotificationController.cleanup);

export default router;
