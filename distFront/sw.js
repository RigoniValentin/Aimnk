// AIMNK Community - Service Worker for Push Notifications
// Version: 1.0.0

const CACHE_NAME = "viajealser-community-v1";

// Detectar la base URL según el entorno
const getApiBaseUrl = () => {
  const hostname = self.location.hostname;

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:3013/api/v1";
  } else {
    return "https://viajealser.com/api/v1";
  }
};

const API_BASE = getApiBaseUrl();

// URLs para cachear (opcional)
const urlsToCache = ["/comunidad", "/assets/Logos/LogoComunidad.png"];

// Instalación del Service Worker
self.addEventListener("install", (event) => {
  console.log("🔧 Service Worker: Instalando...");

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("📦 Service Worker: Cache abierto");
      return cache.addAll(urlsToCache);
    }),
  );

  // Activar inmediatamente
  self.skipWaiting();
});

// Activación del Service Worker
self.addEventListener("activate", (event) => {
  console.log("✅ Service Worker: Activado");

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log(
              "🗑️ Service Worker: Eliminando cache obsoleto",
              cacheName,
            );
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );

  // Tomar control de todas las páginas
  self.clients.claim();
});

// ====== PUSH NOTIFICATIONS ======

// Escuchar notificaciones push
self.addEventListener("push", (event) => {
  console.log("🔔 Push notification recibida:", event);

  let notificationData = {
    title: "Comunidad S.E.R",
    body: "Tienes una nueva notificación",
    icon: "/assets/Logos/LogoComunidad.png",
    badge: "/icon-badge-72.png",
    tag: "default",
    data: {
      url: "/SER",
    },
  };

  // Parsear datos si existen
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = {
        ...notificationData,
        ...pushData,
      };
    } catch (err) {
      console.error("❌ Error parseando push data:", err);
    }
  }

  // Mostrar la notificación
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      requireInteraction: false,
      silent: false,
      actions: notificationData.actions || [
        {
          action: "open",
          title: "Ver en la comunidad",
        },
      ],
    }),
  );
});

// Click en notificación
self.addEventListener("notificationclick", (event) => {
  console.log("👆 Click en notificación:", event.notification.data);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/comunidad";

  // Abrir o enfocar la aplicación
  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Buscar si ya hay una ventana abierta de la comunidad
        for (let client of clientList) {
          if (client.url.includes("/comunidad") && "focus" in client) {
            return client.focus();
          }
        }

        // Si no hay ventana abierta, crear una nueva
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      }),
  );
});

// Cerrar notificación
self.addEventListener("notificationclose", (event) => {
  console.log("❌ Notificación cerrada:", event.notification.data);

  // Opcional: Enviar analíticas de cierre
  // fetch(`${API_BASE}/push/analytics/close`, {
  //   method: 'POST',
  //   body: JSON.stringify({ notificationId: event.notification.data?.id })
  // });
});

// Manejo de mensajes desde el cliente
self.addEventListener("message", (event) => {
  console.log("💬 Mensaje recibido en SW:", event.data);

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Fetch interceptor (opcional para cache)
self.addEventListener("fetch", (event) => {
  // Solo manejar requests GET para recursos estáticos
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Devolver desde cache si existe, sino fetch normal
      return response || fetch(event.request);
    }),
  );
});

console.log("🚀 AIMNK Service Worker cargado correctamente");
