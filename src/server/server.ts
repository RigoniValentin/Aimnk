import express, { Application } from "express";
import path from "path";
import fs from "fs";
import routes from "@routes/routes";
import morgan from "morgan";
import cors, { CorsOptions } from "cors";
import cookieParser from "cookie-parser";

const app: Application = express();

// Parse FRONT_ORIGINS env (coma-separado) y FRONT_ORIGIN (single) en una lista
const fromEnvList = (process.env.FRONT_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const fromEnvSingle = (process.env.FRONT_ORIGIN || "").trim();

const allowedOrigins = [
  ...fromEnvList,
  fromEnvSingle || undefined,
  "http://localhost:5173",
  "https://localhost:5173",
  process.env.NODE_ENV === "production" ? "https://viajealser.com" : undefined,
].filter(Boolean) as string[];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Permitir requests sin "Origin" (por ejemplo, curl o same-origin)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
const projectRoot = process.cwd();

app.use(cookieParser());
app.use(express.json());
app.use(morgan("dev"));
// Añadir Vary: Origin para respuestas cacheables y manejar CORS con credenciales
app.use((req, res, next) => {
  res.header("Vary", "Origin");

  // CSP optimizado para PayPal (solo en producción)
  if (process.env.NODE_ENV === "production") {
    res.header(
      "Content-Security-Policy",
      "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.paypal.com https://*.paypalobjects.com https://www.paypal.com; " +
        "style-src 'self' 'unsafe-inline' https://*.paypal.com; " +
        "connect-src 'self' https://*.paypal.com; " +
        "frame-src 'self' https://*.paypal.com; " +
        "img-src 'self' data: https://*.paypal.com https://*.paypalobjects.com; " +
        "font-src 'self' https://*.paypal.com; " +
        "media-src 'self';"
    );
  }

  next();
});
app.use(cors(corsOptions));
// Responder preflight de forma explícita
app.options("*", cors(corsOptions));

// Servir archivos de imágenes de productos
app.use("/uploads", express.static(path.join(projectRoot, "uploads")));

// Registrar rutas de la API
app.use("/api/v1", routes());

// Servir archivos estáticos del frontend (si existe distFront)
const distFrontPath = path.join(projectRoot, "distFront");
const hasDistFront = fs.existsSync(distFrontPath);

if (hasDistFront) {
  app.use("/", express.static(distFrontPath, { index: "index.html" }));
  // Fallback de SPA solo para rutas que NO comienzan con /api
  app.get(/^\/(?!api).*/, (req, res) => {
    return res.sendFile(path.join(distFrontPath, "index.html"));
  });
} else if (process.env.NODE_ENV === "production") {
  console.warn(
    "distFront no encontrado; el frontend no se servirá desde este servidor."
  );
}

import { createServer } from "http";

// Crear servidor HTTP usando la app de Express
const httpServer = createServer(app);

// Socket.IO eliminado del proyecto

// Lógica de cierre gracioso en server.ts
const shutdown = () => {
  console.log("Cerrando servidor...");
  httpServer.close(() => {
    console.log("Servidor HTTP cerrado.");
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export { httpServer };
