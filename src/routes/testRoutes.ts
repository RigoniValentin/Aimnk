import { Router, Request, Response } from "express";
import { verifyToken } from "@middlewares/auth";
import { emitToCommunity, emitToPost, emitToUser, hasIO } from "@socket/io";

const router = Router();

// Test básico de WebSocket
router.post("/websocket", verifyToken, (req: Request, res: Response): void => {
  try {
    const testPost = {
      id: "test-" + Date.now(),
      author: {
        id: req.currentUser.id,
        username: req.currentUser.username,
        name: req.currentUser.name,
        avatar: (req.currentUser as any).avatar,
      },
      content:
        "🧪 POST DE PRUEBA WEBSOCKET - " + new Date().toLocaleTimeString(),
      images: [],
      createdAt: new Date().toISOString(),
      likes: Math.floor(Math.random() * 50),
      comments: Math.floor(Math.random() * 20),
      shares: Math.floor(Math.random() * 10),
      isLiked: false,
      isBookmarked: false,
    };

    // Verificar si IO está disponible
    if (!hasIO()) {
      res.status(500).json({
        success: false,
        message: "WebSocket no está inicializado",
        ioStatus: "DISCONNECTED",
      });
      return;
    }

    // Emitir evento a la comunidad
    emitToCommunity("new-post", testPost);
    console.log("🧪 [TEST] Evento new-post emitido:", testPost.id);

    res.json({
      success: true,
      message: "Evento WebSocket emitido exitosamente",
      testPost,
      ioStatus: "CONNECTED",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("❌ Error en test WebSocket:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      ioStatus: "ERROR",
    });
  }
});

// Test de like en tiempo real
router.post(
  "/websocket-like/:postId",
  verifyToken,
  (req: Request, res: Response): void => {
    try {
      const { postId } = req.params;
      const isLiked = Math.random() > 0.5;
      const likesCount = Math.floor(Math.random() * 100);

      const likeEvent = {
        postId,
        likesCount,
        [isLiked ? "likedBy" : "unlikedBy"]: req.currentUser.id,
      };

      emitToCommunity(isLiked ? "post-liked" : "post-unliked", likeEvent);
      emitToPost(postId, isLiked ? "post-liked" : "post-unliked", likeEvent);

      console.log(
        `🧪 [TEST] Evento ${isLiked ? "post-liked" : "post-unliked"} emitido:`,
        likeEvent
      );

      res.json({
        success: true,
        message: `Evento ${isLiked ? "like" : "unlike"} emitido`,
        event: likeEvent,
        ioStatus: hasIO() ? "CONNECTED" : "DISCONNECTED",
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Test de conexiones activas
router.get(
  "/websocket-status",
  verifyToken,
  (req: Request, res: Response): void => {
    try {
      if (!hasIO()) {
        res.status(500).json({
          success: false,
          message: "WebSocket no está disponible",
          ioStatus: "DISCONNECTED",
        });
        return;
      }

      // Obtener información de conexiones activas
      const { getIO } = require("@socket/io");
      const io = getIO();

      const connectedSockets = Array.from(io.sockets.sockets.values());
      const communityRoom = io.sockets.adapter.rooms.get("community");
      const connectedUsers = connectedSockets.map((socket: any) => ({
        id: socket.data?.user?.id,
        username: socket.data?.user?.username,
        socketId: socket.id,
      }));

      res.json({
        success: true,
        message: "WebSocket está funcionando correctamente",
        ioStatus: "CONNECTED",
        connectedSockets: connectedSockets.length,
        communityRoomSize: communityRoom?.size || 0,
        connectedUsers,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
        ioStatus: "ERROR",
      });
    }
  }
);

export default router;
