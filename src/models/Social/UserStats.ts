import mongoose, { Schema, Document } from "mongoose";

export interface IUserStats extends Document {
  userId: mongoose.Types.ObjectId;

  // Estadísticas sociales
  postsCount: number;
  followersCount: number;
  followingCount: number;
  likesReceived: number;

  // Estadísticas AIMNK específicas
  level: number;
  xp: number;
  nextLevelXp: number;
  experiencesCompleted: number;
  communitiesJoined: number;
  cardsCollected: number;
  totalVotes: number;
  sessionsCompleted: number;
  hoursMediated: number;
  experienceLevel: string;
  currentStreak: number;

  // Actividad
  lastActive: Date;
  sessionsThisWeek: number;
  streakDays: number;

  updatedAt: Date;

  // Métodos
  calculateLevel(xp: number): number;
  getNextLevelXP(currentLevel: number): number;
  addXP(amount: number): void;
}

const UserStatsSchema = new Schema<IUserStats>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    // Estadísticas sociales
    postsCount: { type: Number, default: 0, min: 0 },
    followersCount: { type: Number, default: 0, min: 0 },
    followingCount: { type: Number, default: 0, min: 0 },
    likesReceived: { type: Number, default: 0, min: 0 },

    // Estadísticas AIMNK específicas
    level: { type: Number, default: 1, min: 1 },
    xp: { type: Number, default: 0, min: 0 },
    nextLevelXp: { type: Number, default: 100, min: 1 },
    experiencesCompleted: { type: Number, default: 0, min: 0 },
    communitiesJoined: { type: Number, default: 0, min: 0 },
    cardsCollected: { type: Number, default: 0, min: 0 },
    totalVotes: { type: Number, default: 0, min: 0 },
    sessionsCompleted: { type: Number, default: 0, min: 0 },
    hoursMediated: { type: Number, default: 0, min: 0 },
    experienceLevel: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", "expert", "master"],
      default: "beginner",
    },
    currentStreak: { type: Number, default: 0, min: 0 },

    // Actividad
    lastActive: { type: Date, default: Date.now },
    sessionsThisWeek: { type: Number, default: 0, min: 0 },
    streakDays: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
    versionKey: false,
  }
);

// Índices
UserStatsSchema.index({ userId: 1 });
UserStatsSchema.index({ level: -1 });
UserStatsSchema.index({ xp: -1 });
UserStatsSchema.index({ lastActive: -1 });

// Métodos para cálculos de nivel y XP
UserStatsSchema.methods.calculateLevel = function (xp: number): number {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
};

UserStatsSchema.methods.getNextLevelXP = function (
  currentLevel: number
): number {
  return Math.pow(currentLevel, 2) * 100;
};

UserStatsSchema.methods.addXP = function (amount: number): void {
  this.xp += amount;
  const newLevel = this.calculateLevel(this.xp);

  if (newLevel > this.level) {
    this.level = newLevel;
    // Trigger level up event aquí si es necesario
  }

  this.nextLevelXp = this.getNextLevelXP(this.level);
};

// Pre-save middleware para recalcular nivel automáticamente
UserStatsSchema.pre<IUserStats>("save", function (next) {
  if (this.isModified("xp")) {
    const newLevel = this.calculateLevel(this.xp);
    if (newLevel !== this.level) {
      this.level = newLevel;
    }
    this.nextLevelXp = this.getNextLevelXP(this.level);
  }
  next();
});

export const UserStatsModel = mongoose.model<IUserStats>(
  "UserStats",
  UserStatsSchema
);
