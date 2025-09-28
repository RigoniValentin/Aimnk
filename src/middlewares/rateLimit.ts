import rateLimit from "express-rate-limit";

// Configuración más permisiva para desarrollo
const isDevelopment = process.env.NODE_ENV !== "production";

export const postsLimiter = rateLimit({
  windowMs: isDevelopment ? 1 * 60 * 1000 : 60 * 60 * 1000, // Dev: 1 min, Prod: 1 hora
  max: isDevelopment ? 100 : 10, // Dev: 100 posts/min, Prod: 10 posts/hora
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: isDevelopment
      ? "Demasiados posts. Límite: 100 por minuto (desarrollo)"
      : "Demasiados posts. Límite: 10 por hora",
    error: "RATE_LIMIT_EXCEEDED",
  },
});

export const commentsLimiter = rateLimit({
  windowMs: isDevelopment ? 1 * 60 * 1000 : 60 * 60 * 1000, // Dev: 1 min, Prod: 1 hora
  max: isDevelopment ? 200 : 30, // Dev: 200 comments/min, Prod: 30 comments/hora
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: isDevelopment
      ? "Demasiados comentarios. Límite: 200 por minuto (desarrollo)"
      : "Demasiados comentarios. Límite: 30 por hora",
    error: "RATE_LIMIT_EXCEEDED",
  },
});

export const likesLimiter = rateLimit({
  windowMs: isDevelopment ? 1 * 60 * 1000 : 60 * 60 * 1000, // Dev: 1 min, Prod: 1 hora
  max: isDevelopment ? 500 : 100, // Dev: 500 likes/min, Prod: 100 likes/hora
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: isDevelopment
      ? "Demasiados likes. Límite: 500 por minuto (desarrollo)"
      : "Demasiados likes. Límite: 100 por hora",
    error: "RATE_LIMIT_EXCEEDED",
  },
});

export const followsLimiter = rateLimit({
  windowMs: isDevelopment ? 1 * 60 * 1000 : 60 * 60 * 1000, // Dev: 1 min, Prod: 1 hora
  max: isDevelopment ? 100 : 20, // Dev: 100 follows/min, Prod: 20 follows/hora
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: isDevelopment
      ? "Demasiados follows. Límite: 100 por minuto (desarrollo)"
      : "Demasiados follows. Límite: 20 por hora",
    error: "RATE_LIMIT_EXCEEDED",
  },
});
