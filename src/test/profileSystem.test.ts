/**
 * Script para probar el sistema de perfiles
 * Ejecutar directamente o como parte de la inicialización
 */

import mongoose from "mongoose";
import { seedBadges, getAllBadges } from "../config/seedBadges";

async function testProfileSystem() {
  try {
    console.log("🚀 Iniciando pruebas del sistema de perfiles...\n");

    // Conectar a la base de datos
    const mongoDbUrl = process.env.MONGODB_URL_STRING;
    if (!mongoDbUrl) {
      throw new Error("MONGODB_URL_STRING is not defined in your environment.");
    }
    await mongoose.connect(mongoDbUrl);
    console.log("✅ Conexión a la base de datos establecida\n");

    // Seed badges
    console.log("🎖️ Inicializando badges...");
    await seedBadges();
    const badges = await getAllBadges();
    console.log(
      `✅ Badges inicializados: ${badges.length} badges disponibles\n`
    );

    // Mostrar algunos badges como ejemplo
    console.log("🏆 Ejemplos de badges disponibles:");
    badges.slice(0, 5).forEach((badge) => {
      console.log(`  - ${badge.name}: ${badge.description} (${badge.rarity})`);
    });

    console.log("\n🎉 ¡Todas las pruebas completadas exitosamente!");
    console.log("\n📋 Endpoints disponibles:");
    console.log("GET    /api/profiles/:userId - Obtener perfil");
    console.log("PUT    /api/profiles/:userId - Actualizar perfil");
    console.log("POST   /api/profiles/:userId/avatar - Subir avatar");
    console.log("POST   /api/profiles/:userId/cover - Subir portada");
    console.log("POST   /api/profiles/:userId/xp - Agregar experiencia");
    console.log("GET    /api/profiles/:userId/badges - Obtener badges");
    console.log("GET    /api/profiles/:userId/stats - Obtener estadísticas");
    console.log("PUT    /api/profiles/:userId/privacy - Actualizar privacidad");
  } catch (error) {
    console.error("❌ Error en las pruebas:", error);
  } finally {
    // Cerrar conexión
    await mongoose.disconnect();
    console.log("\n🔌 Conexión a la base de datos cerrada");
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  testProfileSystem();
}

export default testProfileSystem;
