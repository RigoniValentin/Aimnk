#!/usr/bin/env node

/**
 * Script para generar claves VAPID para push notifications
 *
 * Las claves VAPID (Voluntary Application Server Identification) son necesarias
 * para enviar push notifications de manera segura desde el servidor.
 *
 * Uso:
 *   node generate-vapid-keys.js
 *
 * ⚠️ IMPORTANTE:
 * - Guarda estas claves de forma segura
 * - No compartas la clave privada
 * - Usa las mismas claves en todos los entornos para mantener consistencia
 *
 * @author AIMNK Backend Team
 */

const webpush = require("web-push");

function generateVapidKeys() {
  try {
    // Generar claves VAPID usando web-push (formato correcto)
    const vapidKeys = webpush.generateVAPIDKeys();
    
    const publicKeyBase64 = vapidKeys.publicKey;
    const privateKeyBase64 = vapidKeys.privateKey;

    console.log("🔑 VAPID Keys generadas exitosamente:");
    console.log("=".repeat(60));
    console.log("");
    console.log("📋 Agrega estas variables a tu archivo .env:");
    console.log("");
    console.log("# Push Notifications Configuration");
    console.log(`PUSH_NOTIFICATIONS_ENABLED=true`);
    console.log(`VAPID_PUBLIC_KEY=${publicKeyBase64}`);
    console.log(`VAPID_PRIVATE_KEY=${privateKeyBase64}`);
    console.log(`VAPID_SUBJECT=mailto:admin@tudominio.com`);
    console.log("");
    console.log("🔒 SEGURIDAD:");
    console.log("- Guarda la clave privada de forma segura");
    console.log("- No compartas las claves en repositorios públicos");
    console.log("- Reemplaza el email con tu dominio real");
    console.log("");
    console.log("🚀 Después de agregar las variables, reinicia tu servidor:");
    console.log("   pm2 restart tu-app");
    console.log("");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Error generando claves VAPID:", error);
  }
}

generateVapidKeys();
