import express, { Application } from "express";
import path from "path";
import routes from "@routes/routes";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";

const app: Application = express();
const projectRoot = process.cwd();

app.use(cookieParser());
app.use(express.json());
app.use(morgan("dev"));
app.use(cors());

// Servir archivos de imágenes (productos y social)
app.use("/uploads", express.static(path.join(projectRoot, "uploads")));

// Registrar rutas de la API ANTES de los archivos estáticos
app.use("/api/v1", routes());

// Servir archivos estáticos del frontend SOLO en producción
if (process.env.NODE_ENV === "production") {
  app.use(
    "/",
    express.static(path.join(projectRoot, "distFront"), { index: "index.html" })
  );
  app.get("*", (req, res) => {
    return res.sendFile(path.join(projectRoot, "distFront", "index.html"));
  });
}

import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { UserModel } from "@models/Users";
import { setIO } from "@socket/io";

// Crear servidor HTTP usando la app de Express
const httpServer = createServer(app);

// Socket.IO para tiempo real con autenticación JWT y rooms
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "https://localhost:5173"],
    credentials: true,
  },
  pingInterval: 25000,
  pingTimeout: 60000,
  transports: ["websocket", "polling"],
});

// Registrar instancia global para emisiones desde controladores/servicios
setIO(io);

type SocketUser = {
  id: string;
  username: string;
  name: string;
  avatar?: string;
};

// Map to limit one concurrent connection per user (optional)
const userConnections = new Map<string, string>(); // userId -> socketId

const verifySocketAuth = async (socket: any, next: (err?: any) => void) => {
  try {
    const token =
      socket.handshake?.auth?.token ||
      socket.handshake?.headers?.authorization?.replace("Bearer ", "");
    if (!token) return next(new Error("Unauthorized"));
    const jwtSecret = process.env.JWT_SECRET as string;
    const payload = jwt.verify(token, jwtSecret) as { id: string };
    const user = await UserModel.findById(payload.id).select(
      "_id username name avatar"
    );
    if (!user) return next(new Error("Unauthorized"));
    socket.data.user = {
      id: String(user._id),
      username: user.username,
      name: user.name,
      avatar: user.avatar,
    } as SocketUser;
    next();
  } catch (err) {
    next(new Error("Unauthorized"));
  }
};

io.use(verifySocketAuth);

io.on("connection", (socket) => {
  const user = socket.data.user as SocketUser;

  // TEMPORALMENTE DESHABILITADO - evitar bucle de reconexión
  // const existing = userConnections.get(user.id);
  // if (existing && existing !== socket.id) {
  //   io.sockets.sockets.get(existing)?.disconnect(true);
  // }
  userConnections.set(user.id, socket.id);

  // auto join rooms
  socket.join("community");
  socket.join(`user-${user.id}`);

  console.log(`[socket] connection user=${user.id} socket=${socket.id}`);
  io.to("community").emit("user-online", { userId: user.id });

  // room management
  socket.on("join-community", () => {
    socket.join("community");
    console.log(`[socket] ${user.username} joined community`);
  });
  socket.on("leave-community", () => {
    socket.leave("community");
    console.log(`[socket] ${user.username} left community`);
  });
  socket.on("join-post", (postId: string) => {
    socket.join(`post-${postId}`);
    console.log(`[socket] ${user.username} joined post-${postId}`);
  });
  socket.on("leave-post", (postId: string) => {
    socket.leave(`post-${postId}`);
    console.log(`[socket] ${user.username} left post-${postId}`);
  });

  // typing indicators
  socket.on("start-typing", (postId: string) => {
    socket.to(`post-${postId}`).emit("user-typing", {
      postId,
      userId: user.id,
      username: user.username,
    });
  });
  socket.on("stop-typing", (postId: string) => {
    socket
      .to(`post-${postId}`)
      .emit("user-stop-typing", { postId, userId: user.id });
  });

  socket.on("disconnect", (reason) => {
    console.log(
      `[socket] disconnect user=${user?.id} socket=${socket.id} reason=${reason}`
    );
    if (user?.id && userConnections.get(user.id) === socket.id) {
      userConnections.delete(user.id);
    }
    io.to("community").emit("user-offline", { userId: user?.id });
  });

  // Accept client-triggered new post broadcast as a convenience
  socket.on("new-post-created", (data: any) => {
    console.log(`[socket] new-post-created broadcast by user=${user.id}`);
    io.to("community").emit("new-post", data?.post ?? data);
  });
});

// Mantener alias pero delegar a helpers del módulo socket
export { emitToCommunity, emitToPost, emitToUser } from "@socket/io";
export const emitNotification = (
  toUserId: string,
  event: string,
  payload: any
) => {
  const { emitToUser } = require("@socket/io");
  emitToUser(toUserId, event, payload);
};

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
