// AIMNK Community - Service Worker for Push Notifications
// Version: 1.1.0

const CACHE_NAME = "aimnk-community-v1";

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

// Instalar Service Worker
self.addEventListener("install", (event) => {
  console.log("🔧 Service Worker: Instalando...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("📦 Service Worker: Cache abierto");
        // Solo cachear recursos básicos que sabemos que existen
        return cache.addAll(["/", "/manifest.json"]).catch((error) => {
          console.warn("⚠️ Algunos recursos no se pudieron cachear:", error);
          // No fallar la instalación por errores de cache
          return Promise.resolve();
        });
      })
      .then(() => {
        console.log("✅ Service Worker: Instalado correctamente");
        // Forzar activación inmediata
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("❌ Error instalando Service Worker:", error);
      })
  );
});

// Activar Service Worker
self.addEventListener("activate", (event) => {
  console.log("🔄 Service Worker: Activando...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("🗑️ Eliminando cache anterior:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("✅ Service Worker: Activado correctamente");
        // Tomar control inmediato de todas las páginas
        return self.clients.claim();
      })
  );
});

// Interceptar requests (estrategia Network First para la app dinámica)
self.addEventListener("fetch", (event) => {
  // Solo manejar requests GET
  if (event.request.method !== "GET") {
    return;
  }

  // Estrategia Network First para recursos dinámicos
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Si la respuesta es válida, clonarla y guardarla en cache
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            })
            .catch(() => {
              // Silenciar errores de cache en fetch
            });
        }
        return response;
      })
      .catch(() => {
        // Si falla la red, intentar servir desde cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Si no hay cache, devolver página offline básica
          if (event.request.destination === "document") {
            return new Response(
              `
                <!DOCTYPE html>
                <html>
                <head>
                  <title>AIMNK - Sin conexión</title>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <style>
                    body { 
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                      text-align: center; 
                      padding: 50px; 
                      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                      color: white;
                      min-height: 100vh;
                      margin: 0;
                      display: flex;
                      flex-direction: column;
                      justify-content: center;
                      align-items: center;
                    }
                    .offline-container {
                      background: rgba(255,255,255,0.1);
                      padding: 40px;
                      border-radius: 20px;
                      backdrop-filter: blur(10px);
                      border: 1px solid rgba(255,255,255,0.2);
                    }
                    h1 { margin-bottom: 20px; }
                    p { margin-bottom: 30px; opacity: 0.9; }
                    button {
                      background: #4CAF50;
                      color: white;
                      border: none;
                      padding: 12px 24px;
                      border-radius: 25px;
                      cursor: pointer;
                      font-size: 16px;
                      transition: background 0.3s;
                    }
                    button:hover { background: #45a049; }
                  </style>
                </head>
                <body>
                  <div class="offline-container">
                    <h1>🌐 Sin conexión</h1>
                    <p>No hay conexión a internet. Verifica tu conexión e intenta nuevamente.</p>
                    <button onclick="window.location.reload()">🔄 Reintentar</button>
                  </div>
                </body>
                </html>
              `,
              {
                headers: {
                  "Content-Type": "text/html",
                },
              }
            );
          }
          throw new Error("Sin conexión y sin cache disponible");
        });
      })
  );
});

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
    })
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
      })
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
    })
  );
});

console.log("🚀 AIMNK Service Worker cargado correctamente");
