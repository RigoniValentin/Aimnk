import mongoose, { Schema, Document } from "mongoose";

// Interfaces
export interface IMood {
  current: string;
  emoji: string;
  color: string;
  updatedAt: Date;
}

export interface IBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  category: "achievement" | "milestone" | "special" | "seasonal";
  unlockedAt: Date;
  progress?: {
    current: number;
    total: number;
  };
}

export interface IAimnkStats {
  level: number;
  xp: number;
  nextLevelXp: number;
  experiencesCompleted: number;
  communitiesJoined: number;
  cardsCollected: number;
  totalVotes: number;
  sessionsCompleted?: number;
  hoursMediated?: number;
  experienceLevel?: string;
  currentStreak?: number;
}

export interface ISocialLinks {
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  youtube?: string;
}

export interface IPrivacySettings {
  profileVisibility: "public" | "friends" | "private";
  showEmail: boolean;
  showStats: boolean;
  allowMessages: boolean;
}

export interface IUserProfile extends Document {
  userId: mongoose.Types.ObjectId;
  displayName: string;
  bio?: string;
  location?: string;
  website?: string;
  birthDate?: Date;
  coverImage?: string;
  status: "online" | "away" | "busy" | "offline";
  mood?: IMood;
  interests: string[];
  socialLinks?: ISocialLinks;
  privacy: IPrivacySettings;
  createdAt: Date;
  updatedAt: Date;
}

// Schemas
const MoodSchema = new Schema<IMood>(
  {
    current: { type: String, required: true },
    emoji: { type: String, required: true },
    color: { type: String, required: true, match: /^#[0-9A-Fa-f]{6}$/ },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const PrivacySchema = new Schema<IPrivacySettings>(
  {
    profileVisibility: {
      type: String,
      enum: ["public", "friends", "private"],
      default: "public",
    },
    showEmail: { type: Boolean, default: false },
    showStats: { type: Boolean, default: true },
    allowMessages: { type: Boolean, default: true },
  },
  { _id: false }
);

const SocialLinksSchema = new Schema<ISocialLinks>(
  {
    instagram: {
      type: String,
      validate: {
        validator: (url: string) =>
          !url || /^https?:\/\/(www\.)?instagram\.com\//.test(url),
        message: "Instagram URL inválida",
      },
    },
    twitter: {
      type: String,
      validate: {
        validator: (url: string) =>
          !url || /^https?:\/\/(www\.)?twitter\.com\//.test(url),
        message: "Twitter URL inválida",
      },
    },
    linkedin: {
      type: String,
      validate: {
        validator: (url: string) =>
          !url || /^https?:\/\/(www\.)?linkedin\.com\//.test(url),
        message: "LinkedIn URL inválida",
      },
    },
    youtube: {
      type: String,
      validate: {
        validator: (url: string) =>
          !url || /^https?:\/\/(www\.)?youtube\.com\//.test(url),
        message: "YouTube URL inválida",
      },
    },
  },
  { _id: false }
);

const UserProfileSchema = new Schema<IUserProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
      minlength: 1,
      maxlength: 100,
    },
    bio: {
      type: String,
      maxlength: 500,
    },
    location: {
      type: String,
      maxlength: 100,
    },
    website: {
      type: String,
      validate: {
        validator: (url: string) => !url || /^https?:\/\//.test(url),
        message: "URL inválida",
      },
    },
    birthDate: {
      type: Date,
      validate: {
        validator: (date: Date) => !date || date < new Date(),
        message: "Fecha de nacimiento inválida",
      },
    },
    coverImage: { type: String },
    status: {
      type: String,
      enum: ["online", "away", "busy", "offline"],
      default: "offline",
    },
    mood: MoodSchema,
    interests: {
      type: [String],
      validate: {
        validator: (interests: string[]) => interests.length <= 10,
        message: "Máximo 10 intereses permitidos",
      },
    },
    socialLinks: SocialLinksSchema,
    privacy: {
      type: PrivacySchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Índices
UserProfileSchema.index({ userId: 1 });
UserProfileSchema.index({ displayName: "text", bio: "text" });
UserProfileSchema.index({ "privacy.profileVisibility": 1 });
UserProfileSchema.index({ status: 1 });

export const UserProfileModel = mongoose.model<IUserProfile>(
  "UserProfile",
  UserProfileSchema
);
