import mongoose, { Schema, Document } from "mongoose";

export interface IBadge extends Document {
  name: string;
  description: string;
  icon: string;
  color: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  category: "achievement" | "milestone" | "special" | "seasonal";
  requirements: any; // JSON con los requisitos para obtener el badge
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserBadge extends Document {
  userId: mongoose.Types.ObjectId;
  badgeId: mongoose.Types.ObjectId;
  progressCurrent: number;
  progressTotal: number;
  unlockedAt: Date;
  createdAt: Date;
}

const BadgeSchema = new Schema<IBadge>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    icon: {
      type: String,
      required: true,
      maxlength: 50,
    },
    color: {
      type: String,
      required: true,
      match: /^#[0-9A-Fa-f]{6}$/,
      default: "#6b8e23",
    },
    rarity: {
      type: String,
      enum: ["common", "rare", "epic", "legendary"],
      required: true,
      default: "common",
    },
    category: {
      type: String,
      enum: ["achievement", "milestone", "special", "seasonal"],
      required: true,
      default: "achievement",
    },
    requirements: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const UserBadgeSchema = new Schema<IUserBadge>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    badgeId: {
      type: Schema.Types.ObjectId,
      ref: "Badge",
      required: true,
    },
    progressCurrent: {
      type: Number,
      default: 0,
      min: 0,
    },
    progressTotal: {
      type: Number,
      default: 1,
      min: 1,
    },
    unlockedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { updatedAt: false },
    versionKey: false,
  }
);

// Índices
BadgeSchema.index({ category: 1, rarity: 1 });
BadgeSchema.index({ isActive: 1 });

UserBadgeSchema.index({ userId: 1, badgeId: 1 }, { unique: true });
UserBadgeSchema.index({ userId: 1, unlockedAt: -1 });
UserBadgeSchema.index({ badgeId: 1 });

export const BadgeModel = mongoose.model<IBadge>("Badge", BadgeSchema);
export const UserBadgeModel = mongoose.model<IUserBadge>(
  "UserBadge",
  UserBadgeSchema
);
