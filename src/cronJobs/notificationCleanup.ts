import cron from "node-cron";
import { cleanupOldNotifications } from "../services/social/notificationService";

// Limpiar notificaciones antiguas (>90 días) todos los días a las 2:00 AM
cron.schedule(
  "0 2 * * *",
  async () => {
    console.log(
      "🗑️ Iniciando limpieza automática de notificaciones antiguas..."
    );

    try {
      await cleanupOldNotifications();
      console.log("✅ Limpieza automática completada exitosamente");
    } catch (error) {
      console.error(
        "❌ Error en limpieza automática de notificaciones:",
        error
      );
    }
  },
  {
    timezone: "America/Argentina/Buenos_Aires",
  }
);

console.log(
  "📅 Cron job de limpieza de notificaciones configurado: diario a las 2:00 AM"
);
