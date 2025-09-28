import { Schema, model, Document } from "mongoose";

export interface IPushSubscription extends Document {
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent: string;
  isActive: boolean;
  lastUsed: Date;
  createdAt: Date;
  updatedAt: Date;
  markAsUsed(): Promise<IPushSubscription>;
  deactivate(): Promise<IPushSubscription>;
}

const pushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
      ref: "User",
    },
    endpoint: {
      type: String,
      required: true,
      unique: true,
    },
    keys: {
      p256dh: {
        type: String,
        required: true,
      },
      auth: {
        type: String,
        required: true,
      },
    },
    userAgent: {
      type: String,
      required: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastUsed: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "pushSubscriptions",
  }
);

// Índice compuesto para mejorar performance
pushSubscriptionSchema.index({ userId: 1, isActive: 1 });

// Método para marcar como usado
pushSubscriptionSchema.methods.markAsUsed = function (this: IPushSubscription) {
  this.lastUsed = new Date();
  return this.save();
};

// Método para desactivar suscripción
pushSubscriptionSchema.methods.deactivate = function (this: IPushSubscription) {
  this.isActive = false;
  return this.save();
};

export const PushSubscription = model<IPushSubscription>(
  "PushSubscription",
  pushSubscriptionSchema
);
