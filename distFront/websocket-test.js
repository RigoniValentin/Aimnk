// Test WebSocket Connection from Browser Console
// Copia y pega esto en la consola del navegador para probar WebSocket

window.testWebSocket = function () {
  console.log("🧪 === INICIANDO TEST DE WEBSOCKET ===");

  const token = localStorage.getItem("token");
  if (!token) {
    console.error("❌ No hay token disponible");
    return;
  }

  console.log("🔑 Token encontrado:", token.substring(0, 50) + "...");

  // Intentar conectar manualmente
  const io =
    window.io ||
    (typeof require !== "undefined" ? require("socket.io-client") : null);

  if (!io) {
    console.error("❌ Socket.IO no está disponible");
    return;
  }

  const socket = io("http://localhost:3013", {
    auth: {
      token: token,
    },
    transports: ["websocket", "polling"],
  });

  socket.on("connect", () => {
    console.log("✅ WebSocket conectado exitosamente!");
    console.log("🆔 Socket ID:", socket.id);

    // Test básico
    socket.emit("join-community");
    console.log("📢 Evento 'join-community' enviado");
  });

  socket.on("connect_error", (error) => {
    console.error("❌ Error de conexión:", error);
    console.log("🔍 Posibles causas:");
    console.log("   1. Backend no tiene WebSocket implementado");
    console.log("   2. Puerto incorrecto (¿es 3013?)");
    console.log("   3. CORS no configurado");
    console.log("   4. Token inválido");
  });

  socket.on("disconnect", (reason) => {
    console.log("❌ Desconectado:", reason);
  });

  // Guardar referencia para cleanup
  window.testSocket = socket;

  return socket;
};

// Función para limpiar el test
window.cleanupWebSocketTest = function () {
  if (window.testSocket) {
    window.testSocket.disconnect();
    delete window.testSocket;
    console.log("🧹 Test WebSocket limpiado");
  }
};

console.log(
  "🧪 Test de WebSocket cargado. Ejecuta 'testWebSocket()' para probar la conexión",
);
