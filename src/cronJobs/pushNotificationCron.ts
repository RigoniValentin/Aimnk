import cron from "node-cron";
import { pushNotificationService } from "../services/pushNotificationService";

/**
 * Cron Job para limpiar suscripciones push inactivas
 * Ejecuta diariamente a las 2:00 AM
 */
export const setupPushCleanupCron = () => {
  console.log(
    "⚡ Configurando cron job para limpieza de push notifications..."
  );

  // Ejecutar diariamente a las 2:00 AM
  cron.schedule(
    "0 2 * * *",
    async () => {
      try {
        console.log(
          "🧹 Iniciando limpieza automática de push subscriptions..."
        );

        const deletedCount =
          await pushNotificationService.cleanupSubscriptions();

        console.log(
          `✅ Limpieza completada: ${deletedCount} suscripciones eliminadas`
        );

        // También obtener estadísticas después de la limpieza
        const stats = await pushNotificationService.getStats();
        console.log("📊 Estadísticas post-limpieza:", stats);
      } catch (error) {
        console.error(
          "❌ Error en limpieza automática de push subscriptions:",
          error
        );
      }
    },
    {
      scheduled: true,
      timezone: "America/Argentina/Buenos_Aires", // Ajustar según tu zona horaria
    }
  );

  console.log("✅ Cron job de push notifications configurado correctamente");
};

/**
 * Cron Job para enviar estadísticas semanales (opcional)
 * Ejecuta todos los lunes a las 9:00 AM
 */
export const setupPushStatsCron = () => {
  cron.schedule(
    "0 9 * * 1",
    async () => {
      try {
        console.log("📊 Generando reporte semanal de push notifications...");

        const stats = await pushNotificationService.getStats();

        console.log("📈 Reporte semanal de Push Notifications:");
        console.log(`   • Total de suscripciones: ${stats.totalSubscriptions}`);
        console.log(`   • Suscripciones activas: ${stats.activeSubscriptions}`);
        console.log(
          `   • Suscripciones inactivas: ${stats.inactiveSubscriptions}`
        );
        console.log(
          `   • Usuarios con suscripciones: ${stats.subscriptionsByUser}`
        );

        // Aquí podrías enviar el reporte por email o guardarlo en la DB
      } catch (error) {
        console.error("❌ Error generando estadísticas semanales:", error);
      }
    },
    {
      scheduled: true,
      timezone: "America/Argentina/Buenos_Aires",
    }
  );

  console.log("✅ Cron job de estadísticas semanales configurado");
};

/**
 * Inicializar todos los cron jobs de push notifications
 */
export const initializePushCronJobs = () => {
  console.log("🚀 Inicializando cron jobs de push notifications...");

  setupPushCleanupCron();
  setupPushStatsCron();

  console.log("✅ Todos los cron jobs de push notifications están activos");
};
