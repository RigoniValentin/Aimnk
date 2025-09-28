import { UserProfileModel, IUserProfile } from "@models/Social/UserProfile";
import { UserStatsModel, IUserStats } from "@models/Social/UserStats";
import { UserBadgeModel, BadgeModel } from "@models/Social/Badge";
import { UserModel } from "@models/Users";
import { FollowModel } from "@models/Social/Follow";

export class UserProfileService {
  // Obtener perfil completo de usuario
  async getProfile(userId: string, requesterId?: string) {
    const user = await UserModel.findById(userId)
      .select("-password -resetPasswordToken -resetPasswordExpires")
      .populate("roles", "name permissions");

    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    // Obtener perfil extendido
    let profile = await UserProfileModel.findOne({ userId });

    // Si no existe perfil, crear uno básico
    if (!profile) {
      profile = await UserProfileModel.create({
        userId,
        displayName: user.name,
        privacy: {
          profileVisibility: "public",
          showEmail: false,
          showStats: true,
          allowMessages: true,
        },
      });
    }

    // Verificar permisos de privacidad
    if (
      requesterId !== userId &&
      profile.privacy.profileVisibility === "private"
    ) {
      throw new Error("Perfil privado");
    }

    if (
      requesterId !== userId &&
      profile.privacy.profileVisibility === "friends"
    ) {
      const isFollowing = await this.checkIfFollowing(requesterId!, userId);
      if (!isFollowing) {
        throw new Error("Perfil solo visible para seguidores");
      }
    }

    // Obtener estadísticas
    let stats = await UserStatsModel.findOne({ userId });

    // Si no existen stats, crear básicas
    if (!stats) {
      stats = await UserStatsModel.create({
        userId,
        level: 1,
        xp: 0,
        nextLevelXp: 100,
      });
    }

    // Obtener badges
    const userBadges = await UserBadgeModel.find({ userId })
      .populate("badgeId")
      .sort({ unlockedAt: -1 });

    const badges = userBadges.map((ub) => ({
      id: ub.badgeId._id,
      name: (ub.badgeId as any).name,
      description: (ub.badgeId as any).description,
      icon: (ub.badgeId as any).icon,
      color: (ub.badgeId as any).color,
      rarity: (ub.badgeId as any).rarity,
      category: (ub.badgeId as any).category,
      unlockedAt: ub.unlockedAt,
      progress:
        ub.progressTotal > 1
          ? {
              current: ub.progressCurrent,
              total: ub.progressTotal,
            }
          : undefined,
    }));

    // Construir respuesta completa
    return {
      id: user._id,
      username: user.username,
      displayName: profile.displayName,
      email:
        profile.privacy.showEmail || requesterId === userId
          ? user.email
          : undefined,
      bio: profile.bio,
      location: profile.location,
      website: profile.website,
      birthDate: profile.birthDate,
      joinDate: user.createdAt,
      avatar: user.avatar,
      coverImage: profile.coverImage,
      status: profile.status,
      isVerified: user.isVerified,
      isPro: user.subscription?.expirationDate
        ? new Date() < user.subscription.expirationDate
        : false,
      mood: profile.mood,
      postsCount: stats.postsCount,
      followersCount: stats.followersCount,
      followingCount: stats.followingCount,
      likesReceived: stats.likesReceived,
      aimnkStats: {
        level: stats.level,
        xp: stats.xp,
        nextLevelXp: stats.nextLevelXp,
        experiencesCompleted: stats.experiencesCompleted,
        communitiesJoined: stats.communitiesJoined,
        cardsCollected: stats.cardsCollected,
        totalVotes: stats.totalVotes,
        sessionsCompleted: stats.sessionsCompleted,
        hoursMediated: stats.hoursMediated,
        experienceLevel: stats.experienceLevel,
        currentStreak: stats.currentStreak,
      },
      badges,
      interests: profile.interests,
      socialLinks: profile.socialLinks,
      privacy: requesterId === userId ? profile.privacy : undefined,
    };
  }

  // Actualizar perfil
  async updateProfile(userId: string, updateData: any) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    // Actualizar campos básicos del usuario si están presentes
    if (updateData.displayName && updateData.displayName !== user.name) {
      await UserModel.findByIdAndUpdate(userId, {
        name: updateData.displayName,
      });
    }

    // Actualizar o crear perfil
    let profile = await UserProfileModel.findOne({ userId });

    if (!profile) {
      profile = new UserProfileModel({
        userId,
        displayName: updateData.displayName || user.name,
      });
    }

    // Actualizar campos del perfil
    if (updateData.displayName) profile.displayName = updateData.displayName;
    if (updateData.bio !== undefined) profile.bio = updateData.bio;
    if (updateData.location !== undefined)
      profile.location = updateData.location;
    if (updateData.website !== undefined) profile.website = updateData.website;
    if (updateData.birthDate !== undefined)
      profile.birthDate = updateData.birthDate;
    if (updateData.mood)
      profile.mood = { ...updateData.mood, updatedAt: new Date() };
    if (updateData.interests) profile.interests = updateData.interests;
    if (updateData.socialLinks) profile.socialLinks = updateData.socialLinks;
    if (updateData.privacy)
      profile.privacy = { ...profile.privacy, ...updateData.privacy };

    await profile.save();

    return this.getProfile(userId, userId);
  }

  // Obtener estadísticas detalladas
  async getStats(userId: string) {
    const stats = await UserStatsModel.findOne({ userId });

    if (!stats) {
      throw new Error("Estadísticas no encontradas");
    }

    return {
      social: {
        postsCount: stats.postsCount,
        followersCount: stats.followersCount,
        followingCount: stats.followingCount,
        likesReceived: stats.likesReceived,
      },
      aimnk: {
        level: stats.level,
        xp: stats.xp,
        nextLevelXp: stats.nextLevelXp,
        experiencesCompleted: stats.experiencesCompleted,
        communitiesJoined: stats.communitiesJoined,
        cardsCollected: stats.cardsCollected,
        totalVotes: stats.totalVotes,
      },
      activity: {
        lastActive: stats.lastActive,
        sessionsThisWeek: stats.sessionsThisWeek,
        streakDays: stats.streakDays,
      },
    };
  }

  // Agregar XP
  async addXP(userId: string, amount: number, source: string, metadata?: any) {
    let stats = await UserStatsModel.findOne({ userId });

    if (!stats) {
      stats = await UserStatsModel.create({
        userId,
        level: 1,
        xp: 0,
        nextLevelXp: 100,
      });
    }

    const oldLevel = stats.level;
    stats.addXP(amount);
    await stats.save();

    // Si subió de nivel, verificar badges automáticos
    if (stats.level > oldLevel) {
      await this.checkLevelUpBadges(userId, stats.level);
    }

    return {
      xpAdded: amount,
      totalXp: stats.xp,
      level: stats.level,
      leveledUp: stats.level > oldLevel,
      source,
      metadata,
    };
  }

  // Obtener badges de usuario
  async getUserBadges(userId: string) {
    const userBadges = await UserBadgeModel.find({ userId })
      .populate("badgeId")
      .sort({ unlockedAt: -1 });

    const badges = userBadges.map((ub) => ({
      id: ub.badgeId._id,
      name: (ub.badgeId as any).name,
      description: (ub.badgeId as any).description,
      icon: (ub.badgeId as any).icon,
      color: (ub.badgeId as any).color,
      rarity: (ub.badgeId as any).rarity,
      category: (ub.badgeId as any).category,
      unlockedAt: ub.unlockedAt,
      progress:
        ub.progressTotal > 1
          ? {
              current: ub.progressCurrent,
              total: ub.progressTotal,
            }
          : undefined,
    }));

    const categories = {
      achievement: badges.filter((b) => b.category === "achievement").length,
      milestone: badges.filter((b) => b.category === "milestone").length,
      special: badges.filter((b) => b.category === "special").length,
      seasonal: badges.filter((b) => b.category === "seasonal").length,
    };

    return {
      badges,
      totalBadges: badges.length,
      categories,
    };
  }

  // Desbloquear badge
  async unlockBadge(
    userId: string,
    badgeId: string,
    progress?: { current: number; total: number }
  ) {
    // Verificar que el badge existe
    const badge = await BadgeModel.findById(badgeId);
    if (!badge) {
      throw new Error("Badge no encontrado");
    }

    // Verificar si ya tiene el badge
    const existingUserBadge = await UserBadgeModel.findOne({ userId, badgeId });
    if (existingUserBadge) {
      // Si ya tiene el badge, actualizar progreso si se proporciona
      if (progress) {
        existingUserBadge.progressCurrent = progress.current;
        existingUserBadge.progressTotal = progress.total;
        await existingUserBadge.save();
      }
      return existingUserBadge;
    }

    // Crear nuevo user badge
    const userBadge = await UserBadgeModel.create({
      userId,
      badgeId,
      progressCurrent: progress?.current || 1,
      progressTotal: progress?.total || 1,
    });

    return userBadge;
  }

  // Verificar badges automáticos por level up
  private async checkLevelUpBadges(userId: string, newLevel: number) {
    const levelBadges = [
      { level: 5, badgeId: "507f1f77bcf86cd799439011" }, // Badge nivel 5
      { level: 10, badgeId: "507f1f77bcf86cd799439012" }, // Badge nivel 10
      { level: 25, badgeId: "507f1f77bcf86cd799439013" }, // Badge nivel 25
      { level: 50, badgeId: "507f1f77bcf86cd799439014" }, // Badge nivel 50
    ];

    for (const { level, badgeId } of levelBadges) {
      if (newLevel >= level) {
        try {
          await this.unlockBadge(userId, badgeId);
        } catch (error) {
          console.warn(
            `Error unlocking level badge ${badgeId} for user ${userId}:`,
            error
          );
        }
      }
    }
  }

  // Verificar si un usuario sigue a otro
  private async checkIfFollowing(
    followerId: string,
    followingId: string
  ): Promise<boolean> {
    const follow = await FollowModel.findOne({ followerId, followingId });
    return !!follow;
  }

  // Actualizar estado de usuario
  async updateStatus(
    userId: string,
    status: "online" | "away" | "busy" | "offline"
  ) {
    let profile = await UserProfileModel.findOne({ userId });

    if (!profile) {
      const user = await UserModel.findById(userId);
      if (!user) throw new Error("Usuario no encontrado");

      profile = await UserProfileModel.create({
        userId,
        displayName: user.name,
        status,
      });
    } else {
      profile.status = status;
      await profile.save();
    }

    // Actualizar lastActive en stats
    await UserStatsModel.findOneAndUpdate(
      { userId },
      { lastActive: new Date() },
      { upsert: true }
    );

    return profile;
  }
}
