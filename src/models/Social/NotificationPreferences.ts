import mongoose, { Schema, Document, Types } from "mongoose";

export interface INotificationPreferences extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  likes: boolean;
  comments: boolean;
  follows: boolean;
  mentions: boolean;
  replies: boolean;
  post_shared: boolean;
  comment_like: boolean;
  follow_requests: boolean;
  achievements: boolean;
  system: boolean;
  pushNotifications: boolean;
  emailNotifications: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationPreferencesSchema = new Schema<INotificationPreferences>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    likes: {
      type: Boolean,
      default: true,
    },
    comments: {
      type: Boolean,
      default: true,
    },
    follows: {
      type: Boolean,
      default: true,
    },
    mentions: {
      type: Boolean,
      default: true,
    },
    replies: {
      type: Boolean,
      default: true,
    },
    post_shared: {
      type: Boolean,
      default: true,
    },
    comment_like: {
      type: Boolean,
      default: false, // Menos crítico por defecto
    },
    follow_requests: {
      type: Boolean,
      default: true,
    },
    achievements: {
      type: Boolean,
      default: true,
    },
    system: {
      type: Boolean,
      default: true,
    },
    pushNotifications: {
      type: Boolean,
      default: false, // Usuario debe activar explícitamente
    },
    emailNotifications: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.userId; // No exponer el userId en la respuesta
        return ret;
      },
    },
  }
);

// Método estático para obtener o crear preferencias por defecto
NotificationPreferencesSchema.statics.getOrCreatePreferences = async function (
  userId: Types.ObjectId
) {
  let preferences = await this.findOne({ userId });

  if (!preferences) {
    preferences = await this.create({ userId });
    console.log(
      `🔔 Preferencias de notificaciones creadas para usuario: ${userId}`
    );
  }

  return preferences;
};

export const NotificationPreferencesModel =
  mongoose.model<INotificationPreferences>(
    "NotificationPreferences",
    NotificationPreferencesSchema
  );
