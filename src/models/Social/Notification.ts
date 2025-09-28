import mongoose, { Schema, Document, Types } from "mongoose";

// Tipos de notificaciones soportadas según especificación frontend
export type NotificationType =
  | "like" // Usuario da like a un post
  | "comment" // Usuario comenta un post
  | "follow" // Usuario te sigue
  | "mention" // Usuario te menciona en un comentario
  | "reply" // Usuario responde a tu comentario
  | "post_shared" // Usuario comparte tu post (futuro)
  | "comment_like" // Usuario da like a tu comentario
  | "follow_request" // Usuario solicita seguirte (perfiles privados)
  | "follow_accepted" // Tu solicitud de seguimiento fue aceptada
  | "achievement" // Logro desbloqueado
  | "system"; // Notificación del sistema

export type NotificationPriority = "low" | "medium" | "high" | "urgent";

export interface INotification extends Document {
  _id: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  fromUser?: Types.ObjectId; // Opcional para notificaciones del sistema
  toUser: Types.ObjectId; // Usuario que recibe la notificación
  relatedPost?: Types.ObjectId;
  relatedComment?: Types.ObjectId;
  actionUrl?: string; // URL para navegar al hacer click
  metadata: Record<string, any>; // Datos adicionales flexibles
  isRead: boolean;
  priority: NotificationPriority;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    type: {
      type: String,
      enum: [
        "like",
        "comment",
        "follow",
        "mention",
        "reply",
        "post_shared",
        "comment_like",
        "follow_request",
        "follow_accepted",
        "achievement",
        "system",
      ],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 255,
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    fromUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
      // Opcional - null para notificaciones del sistema
    },
    toUser: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    relatedPost: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      index: true,
    },
    relatedComment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      index: true,
    },
    actionUrl: {
      type: String,
      maxlength: 500,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete (ret as any)._id;
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

// Índices compuestos para optimizar consultas
NotificationSchema.index({ toUser: 1, createdAt: -1 });
NotificationSchema.index({ toUser: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, createdAt: -1 });
NotificationSchema.index({ fromUser: 1, toUser: 1, type: 1 }); // Para throttling

export const NotificationModel = mongoose.model<INotification>(
  "Notification",
  NotificationSchema
);
