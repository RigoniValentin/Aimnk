// AIMNK Community - Service Worker for Push Notifications
// Version: 1.1.0

const CACHE_NAME = "aimnk-community-v1";

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
      }),
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
          }),
        );
      })
      .then(() => {
        console.log("✅ Service Worker: Activado correctamente");
        // Tomar control inmediato de todas las páginas
        return self.clients.claim();
      }),
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
              },
            );
          }
          throw new Error("Sin conexión y sin cache disponible");
        });
      }),
  );
});

// Manejar notificaciones push
self.addEventListener("push", async (event) => {
  console.log("🔔 Push notification recibida:", event);

  let notificationData = {
    title: "AIMNK Comunidad",
    body: "Tienes una nueva notificación",
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    tag: "default",
    data: {},
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.tag || notificationData.tag,
        data: data.data || {},
      };
    } catch (error) {
      console.error("❌ Error parseando datos de push:", error);
    }
  }

  event.waitUntil(
    self.registration
      .showNotification(notificationData.title, {
        body: notificationData.body,
        icon: notificationData.icon,
        badge: notificationData.badge,
        tag: notificationData.tag,
        data: notificationData.data,
        requireInteraction: false,
        silent: false,
        actions: [
          {
            action: "open",
            title: "👀 Ver",
            icon: "/icon-192.png",
          },
          {
            action: "dismiss",
            title: "❌ Cerrar",
          },
        ],
      })
      .then(() => {
        console.log("✅ Notificación mostrada correctamente");
      })
      .catch((error) => {
        console.error("❌ Error mostrando notificación:", error);
      }),
  );
});

// Manejar clicks en notificaciones
self.addEventListener("notificationclick", (event) => {
  console.log("👆 Click en notificación:", event);

  event.notification.close();

  if (event.action === "dismiss") {
    console.log("👋 Notificación descartada");
    return;
  }

  // Abrir o enfocar la aplicación
  event.waitUntil(
    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Si hay una ventana abierta, enfocarla
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            console.log("🎯 Enfocando ventana existente");
            return client.focus();
          }
        }

        // Si no hay ventana abierta, abrir una nueva
        if (self.clients.openWindow) {
          console.log("🚀 Abriendo nueva ventana");
          return self.clients.openWindow("/comunidad");
        }
      })
      .catch((error) => {
        console.error("❌ Error manejando click de notificación:", error);
      }),
  );
});

// Manejar errores del Service Worker
self.addEventListener("error", (event) => {
  console.error("❌ Error en Service Worker:", event.error);
});

// Manejar errores de promesas no capturadas
self.addEventListener("unhandledrejection", (event) => {
  console.error("❌ Promesa rechazada en Service Worker:", event.reason);
  event.preventDefault();
});

console.log("🚀 AIMNK Service Worker cargado correctamente");
