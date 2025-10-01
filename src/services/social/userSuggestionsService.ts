import { UserModel } from "@models/Users";
import { FollowModel } from "@models/Social/Follow";
import { PostModel } from "@models/Social/Post";
import { Types } from "mongoose";

export interface SuggestionUser {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  isVerified: boolean;
  followersCount: number;
  mutualFollowers: number;
  mutualFollowersNames: string[];
  reason:
    | "mutual_friends"
    | "similar_interests"
    | "popular"
    | "new_user"
    | "location_based"
    | "algorithm";
  score: number;
  commonInterests: string[];
  recentActivity?: string;
}

export interface SuggestionResponse {
  suggestions: SuggestionUser[];
  refreshToken: string;
  algorithmVersion: string;
  generatedAt: string;
}

export class UserSuggestionsService {
  private readonly WEIGHTS = {
    mutual_connections: 0.35,
    similar_interests: 0.3, // Aumentado para comunidades pequeñas
    activity_engagement: 0.2,
    popularity: 0.25, // Aumentado para incluir más usuarios activos
    proximity: 0.25, // Aumentado para proximidad geográfica
  };

  private readonly MIN_SCORE = 10; // Muy permisivo para comunidades pequeñas
  private readonly ALGORITHM_VERSION = "v2.2"; // Nueva versión más permisiva

  async generateSuggestions(
    currentUserId: string,
    limit: number = 10,
    refresh: boolean = false,
    excludeRecent: number = 7,
    allowIncompleteProfiles: boolean = true,
    includeNewUsers: boolean = true
  ): Promise<SuggestionResponse> {
    const startTime = Date.now();
    console.log(
      `🔍 Generando sugerencias para usuario ${currentUserId} (comunidad pequeña)`
    );

    try {
      // 1. Detectar tamaño de comunidad
      const totalUsers = await UserModel.countDocuments({
        isActive: { $ne: false },
      });
      const isSmallCommunity = totalUsers <= 100;

      // 2. Ajustar parámetros para comunidades pequeñas
      const dynamicExcludeRecent = isSmallCommunity
        ? Math.min(excludeRecent, 1)
        : excludeRecent;
      const dynamicMinScore = isSmallCommunity ? 5 : 50; // Muy bajo para comunidades pequeñas

      console.log(
        `📊 Comunidad detectada: ${totalUsers} usuarios, pequeña: ${isSmallCommunity}`
      );
      console.log(
        `⚙️ Parámetros ajustados: excludeRecent=${dynamicExcludeRecent}, minScore=${dynamicMinScore}`
      );

      // 3. Obtener perfil del usuario actual con populate de intereses
      const currentUser = await UserModel.findById(currentUserId)
        .select(
          "username interests location birthDate nationality followingCount followersCount lastActive"
        )
        .lean();

      if (!currentUser) {
        throw new Error("Usuario no encontrado");
      }

      // 4. Obtener usuarios ya seguidos (excluir de sugerencias)
      const followedUserIds = await this.getFollowedUserIds(currentUserId);

      // 5. Obtener candidatos por diferentes categorías (más permisivo para comunidades pequeñas)
      const candidates = new Set<string>();

      // A) Por conexiones mutuas - más permisivo (incluso 1 amigo común)
      const mutualCandidates = await this.getMutualFollowCandidates(
        currentUserId,
        isSmallCommunity ? 1 : 2 // Reducir requisito mínimo
      );
      mutualCandidates.forEach((id) => candidates.add(id));

      // B) Por intereses similares - más permisivo (1 interés común suficiente)
      if (currentUser.interests && currentUser.interests.length > 0) {
        const interestCandidates = await this.getInterestBasedCandidates(
          currentUser.interests,
          isSmallCommunity ? 0.1 : 0.3 // Reducir overlap requerido
        );
        interestCandidates.forEach((id) => candidates.add(id));
      }

      // C) Por actividad reciente - más inclusivo
      const activeCandidates = await this.getActiveUsers(dynamicExcludeRecent);
      activeCandidates.forEach((id) => candidates.add(id));

      // D) Por ubicación - más permisivo
      if (currentUser.location) {
        const locationCandidates = await this.getLocationBasedCandidates(
          currentUser.location
        );
        locationCandidates.forEach((id) => candidates.add(id));
      }

      // E) Usuarios populares/trending - criterios más amplios
      const trendingCandidates = await this.getTrendingUsers(isSmallCommunity);
      trendingCandidates.forEach((id) => candidates.add(id));

      // F) Para comunidades pequeñas: incluir usuarios nuevos y con perfiles incompletos
      if (isSmallCommunity) {
        const newUserCandidates = await this.getNewUsers(30); // Últimos 30 días
        newUserCandidates.forEach((id) => candidates.add(id));

        if (allowIncompleteProfiles) {
          const incompleteProfileCandidates =
            await this.getUsersWithIncompleteProfiles();
          incompleteProfileCandidates.forEach((id) => candidates.add(id));
        }
      }

      // 4. Filtrar candidatos no válidos
      const validCandidateIds = Array.from(candidates).filter(
        (candidateId) =>
          candidateId !== currentUserId &&
          !followedUserIds.includes(candidateId)
      );

      console.log(`📊 Candidatos encontrados: ${validCandidateIds.length}`);

      if (validCandidateIds.length === 0) {
        return {
          suggestions: [],
          refreshToken: this.generateRefreshToken(),
          algorithmVersion: this.ALGORITHM_VERSION,
          generatedAt: new Date().toISOString(),
        };
      }

      // 5. Obtener información detallada de candidatos
      const candidateUsers = await UserModel.find({
        _id: { $in: validCandidateIds },
        isActive: { $ne: false },
      })
        .select(
          "username name avatar bio isVerified followersCount interests location birthDate createdAt"
        )
        .lean();

      // 6. Calcular scores para cada candidato
      const scoredCandidates = await Promise.all(
        candidateUsers.map(async (candidate: any) => {
          const score = await this.calculateSuggestionScore(
            candidate,
            currentUser
          );

          if (score < dynamicMinScore) return null;

          const mutualFollowers = await this.getMutualFollowersCount(
            currentUserId,
            candidate._id.toString()
          );
          const mutualNames = await this.getMutualFollowersNames(
            currentUserId,
            candidate._id.toString(),
            3
          );
          const reason = this.determinePrimaryReason(
            candidate,
            currentUser,
            mutualFollowers
          );
          const commonInterests = this.getCommonInterests(
            candidate.interests || [],
            currentUser.interests || []
          );
          const recentActivity = await this.getRecentActivity(
            candidate._id.toString()
          );

          return {
            id: candidate._id.toString(),
            username: candidate.username,
            displayName: candidate.name || candidate.username,
            avatar: candidate.avatar || null,
            bio: candidate.bio || null,
            isVerified: candidate.isVerified || false,
            followersCount: candidate.followersCount || 0,
            mutualFollowers,
            mutualFollowersNames: mutualNames,
            reason,
            score: Math.round(score),
            commonInterests,
            recentActivity,
          } as SuggestionUser;
        })
      );

      // 7. Filtrar nulos y ordenar por score
      let validSuggestions = scoredCandidates
        .filter(
          (suggestion): suggestion is SuggestionUser => suggestion !== null
        )
        .sort((a, b) => b.score - a.score);

      // 7.1. Fallback para comunidades pequeñas: si no hay suficientes sugerencias, incluir todos los usuarios disponibles
      if (isSmallCommunity && validSuggestions.length < limit) {
        console.log(
          `🔄 Fallback activado: solo ${validSuggestions.length} sugerencias válidas, agregando más usuarios...`
        );

        const fallbackUsers = await UserModel.find({
          _id: {
            $nin: [
              ...validCandidateIds.map((id) => new Types.ObjectId(id)),
              new Types.ObjectId(currentUserId),
            ],
          },
          isActive: { $ne: false },
        })
          .select(
            "username name avatar bio isVerified followersCount interests createdAt"
          )
          .limit(limit - validSuggestions.length)
          .lean();

        const fallbackSuggestions = fallbackUsers.map(
          (user) =>
            ({
              id: user._id.toString(),
              username: user.username,
              displayName: user.name || user.username,
              avatar: user.avatar || null,
              bio: user.bio || null,
              isVerified: user.isVerified || false,
              followersCount: user.followersCount || 0,
              mutualFollowers: 0,
              mutualFollowersNames: [],
              reason: "new_user" as const,
              score: 50, // Score base para fallback
              commonInterests: [],
              recentActivity: "Usuario disponible",
            } as SuggestionUser)
        );

        validSuggestions = [...validSuggestions, ...fallbackSuggestions];
        console.log(
          `✅ Fallback completado: ahora tenemos ${validSuggestions.length} sugerencias`
        );
      }

      // 8. Aplicar diversidad (no más de 2 de la misma razón consecutivos)
      const diversifiedResults = this.applyDiversityFilter(
        validSuggestions,
        limit
      );

      const executionTime = Date.now() - startTime;
      console.log(
        `✅ Sugerencias generadas: ${diversifiedResults.length} en ${executionTime}ms`
      );

      return {
        suggestions: diversifiedResults,
        refreshToken: this.generateRefreshToken(),
        algorithmVersion: this.ALGORITHM_VERSION,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("❌ Error generando sugerencias:", error);
      throw error;
    }
  }

  private async getFollowedUserIds(userId: string): Promise<string[]> {
    const follows = await FollowModel.find({ followerId: userId })
      .select("followingId")
      .lean();
    return follows.map((f) => f.followingId.toString());
  }

  private async getMutualFollowCandidates(
    currentUserId: string,
    minMutualCount: number = 2
  ): Promise<string[]> {
    // Obtener usuarios que siguen a las mismas personas que el usuario actual
    const pipeline = [
      // Obtener las personas que sigue el usuario actual
      { $match: { followerId: new Types.ObjectId(currentUserId) } },
      { $group: { _id: null, followingIds: { $push: "$followingId" } } },

      // Buscar otros usuarios que siguen a esas mismas personas
      {
        $lookup: {
          from: "follows",
          let: { followingList: "$followingIds" },
          pipeline: [
            { $match: { $expr: { $in: ["$followingId", "$$followingList"] } } },
            {
              $match: {
                followerId: { $ne: new Types.ObjectId(currentUserId) },
              },
            },
            { $group: { _id: "$followerId", mutualCount: { $sum: 1 } } },
            { $match: { mutualCount: { $gte: minMutualCount } } }, // Requisito dinámico
            { $sort: { mutualCount: -1 } },
            { $limit: 50 },
          ],
          as: "mutualUsers",
        },
      },
      { $unwind: "$mutualUsers" },
      { $replaceRoot: { newRoot: "$mutualUsers" } },
    ] as any[]; // Temporary fix for TypeScript issues

    const results = await FollowModel.aggregate(pipeline);
    return results.map((r) => r._id.toString());
  }

  private async getInterestBasedCandidates(
    userInterests: string[],
    minOverlapRatio: number = 0.3
  ): Promise<string[]> {
    if (!userInterests || userInterests.length === 0) return [];

    const minOverlap = Math.max(
      1,
      Math.floor(userInterests.length * minOverlapRatio)
    );

    const users = await UserModel.find({
      interests: { $in: userInterests },
      $expr: {
        $gte: [
          { $size: { $setIntersection: ["$interests", userInterests] } },
          minOverlap,
        ],
      },
    })
      .select("_id")
      .limit(50)
      .lean();

    return users.map((u) => u._id.toString());
  }

  private async getActiveUsers(days: number = 7): Promise<string[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Usuarios con posts recientes o actividad reciente
    const activeUserIds = await PostModel.distinct("authorId", {
      createdAt: { $gte: since },
      isActive: true,
    });

    const recentlyActiveUsers = await UserModel.find({
      $or: [{ _id: { $in: activeUserIds } }, { lastActive: { $gte: since } }],
    })
      .select("_id")
      .limit(50)
      .lean();

    return recentlyActiveUsers.map((u) => u._id.toString());
  }

  private async getLocationBasedCandidates(
    userLocation: string
  ): Promise<string[]> {
    const users = await UserModel.find({
      location: new RegExp(userLocation, "i"),
      isActive: { $ne: false },
    })
      .select("_id")
      .limit(30)
      .lean();

    return users.map((u) => u._id.toString());
  }

  private async getTrendingUsers(
    isSmallCommunity: boolean = false
  ): Promise<string[]> {
    // Para comunidades pequeñas, criterios más permisivos
    const minFollowers = isSmallCommunity ? 1 : 50;
    const maxFollowers = isSmallCommunity ? 500 : 5000;

    const users = await UserModel.find({
      followersCount: { $gte: minFollowers, $lte: maxFollowers },
      isActive: { $ne: false },
    })
      .sort({ followersCount: -1 })
      .select("_id")
      .limit(isSmallCommunity ? 50 : 30)
      .lean();

    return users.map((u) => u._id.toString());
  }

  private async getNewUsers(daysSinceCreation: number = 30): Promise<string[]> {
    const since = new Date(
      Date.now() - daysSinceCreation * 24 * 60 * 60 * 1000
    );

    const users = await UserModel.find({
      createdAt: { $gte: since },
      isActive: { $ne: false },
    })
      .select("_id")
      .limit(20)
      .lean();

    return users.map((u) => u._id.toString());
  }

  private async getUsersWithIncompleteProfiles(): Promise<string[]> {
    // Usuarios con perfiles incompletos pero activos
    const users = await UserModel.find({
      isActive: { $ne: false },
      $or: [
        { bio: { $exists: false } },
        { bio: "" },
        { avatar: { $exists: false } },
        { avatar: "" },
        { interests: { $size: 0 } },
        { interests: { $exists: false } },
      ],
    })
      .select("_id")
      .limit(15)
      .lean();

    return users.map((u) => u._id.toString());
  }

  private async calculateSuggestionScore(
    candidate: any,
    currentUser: any
  ): Promise<number> {
    const scores = {
      mutual_connections: await this.calculateMutualScore(
        candidate._id.toString(),
        currentUser._id.toString()
      ),
      similar_interests: this.calculateInterestSimilarity(
        candidate.interests || [],
        currentUser.interests || []
      ),
      activity_engagement: await this.calculateActivityScore(candidate),
      popularity: this.calculatePopularityScore(candidate),
      proximity: this.calculateProximityScore(candidate, currentUser),
    };

    let finalScore = 0;
    for (const [factor, weight] of Object.entries(this.WEIGHTS)) {
      finalScore += (scores[factor as keyof typeof scores] || 0) * weight;
    }

    return Math.min(finalScore, 100);
  }

  private async calculateMutualScore(
    candidateId: string,
    currentUserId: string
  ): Promise<number> {
    const mutualCount = await this.getMutualFollowersCount(
      currentUserId,
      candidateId
    );
    const currentUserFollowingCount = await FollowModel.countDocuments({
      followerId: currentUserId,
    });

    if (currentUserFollowingCount === 0) return 0;

    // Score basado en el porcentaje de amigos en común
    return Math.min(
      (mutualCount / Math.max(currentUserFollowingCount, 10)) * 100,
      100
    );
  }

  private calculateInterestSimilarity(
    candidateInterests: string[],
    userInterests: string[]
  ): number {
    if (!candidateInterests.length || !userInterests.length) return 0;

    const commonInterests = candidateInterests.filter((interest) =>
      userInterests.some(
        (userInterest) =>
          userInterest.toLowerCase().includes(interest.toLowerCase()) ||
          interest.toLowerCase().includes(userInterest.toLowerCase())
      )
    );

    return (
      (commonInterests.length /
        Math.max(candidateInterests.length, userInterests.length)) *
      100
    );
  }

  private async calculateActivityScore(candidate: any): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const recentPosts = await PostModel.countDocuments({
      authorId: candidate._id,
      createdAt: { $gte: sevenDaysAgo },
      isActive: true,
    });

    const engagementRate =
      candidate.followersCount > 0
        ? Math.min(
            ((candidate.followersCount * 0.05) / candidate.followersCount) *
              100,
            100
          )
        : 0;

    return Math.min(recentPosts * 20 + engagementRate, 100);
  }

  private calculatePopularityScore(candidate: any): number {
    const followersCount = candidate.followersCount || 0;

    if (followersCount > 100000) return 0; // Demasiado popular
    if (followersCount < 10) return 20; // Muy nuevo

    // Sweet spot: entre 50-5000 seguidores
    if (followersCount >= 50 && followersCount <= 5000) {
      return Math.min((followersCount / 5000) * 100, 100);
    }

    return Math.min((followersCount / 10000) * 50, 50);
  }

  private calculateProximityScore(candidate: any, currentUser: any): number {
    let score = 0;

    // Ubicación
    if (candidate.location && currentUser.location) {
      if (
        candidate.location
          .toLowerCase()
          .includes(currentUser.location.toLowerCase()) ||
        currentUser.location
          .toLowerCase()
          .includes(candidate.location.toLowerCase())
      ) {
        score += 40;
      }
    }

    // Edad similar (±5 años)
    if (candidate.birthDate && currentUser.birthDate) {
      const candidateAge =
        new Date().getFullYear() - new Date(candidate.birthDate).getFullYear();
      const currentUserAge =
        new Date().getFullYear() -
        new Date(currentUser.birthDate).getFullYear();
      if (Math.abs(candidateAge - currentUserAge) <= 5) {
        score += 30;
      }
    }

    // Nacionalidad
    if (
      candidate.nationality &&
      currentUser.nationality &&
      candidate.nationality === currentUser.nationality
    ) {
      score += 30;
    }

    return Math.min(score, 100);
  }

  private async getMutualFollowersCount(
    userId1: string,
    userId2: string
  ): Promise<number> {
    const user1Following = await FollowModel.find({ followerId: userId1 })
      .select("followingId")
      .lean();
    const user1FollowingIds = user1Following.map((f) =>
      f.followingId.toString()
    );

    const mutualCount = await FollowModel.countDocuments({
      followerId: userId2,
      followingId: { $in: user1FollowingIds },
    });

    return mutualCount;
  }

  private async getMutualFollowersNames(
    userId1: string,
    userId2: string,
    limit: number = 3
  ): Promise<string[]> {
    const user1Following = await FollowModel.find({ followerId: userId1 })
      .select("followingId")
      .lean();
    const user1FollowingIds = user1Following.map((f) =>
      f.followingId.toString()
    );

    const mutualFollows = await FollowModel.find({
      followerId: userId2,
      followingId: { $in: user1FollowingIds },
    })
      .populate("followingId", "username")
      .limit(limit)
      .lean();

    return mutualFollows.map((f: any) => f.followingId.username);
  }

  private determinePrimaryReason(
    candidate: any,
    currentUser: any,
    mutualCount: number
  ): SuggestionUser["reason"] {
    // Lógica para determinar la razón principal
    if (mutualCount >= 3) return "mutual_friends";

    const interestScore = this.calculateInterestSimilarity(
      candidate.interests || [],
      currentUser.interests || []
    );
    if (interestScore > 60) return "similar_interests";

    const daysSinceCreation =
      (Date.now() - new Date(candidate.createdAt).getTime()) /
      (1000 * 60 * 60 * 24);
    if (daysSinceCreation < 30) return "new_user";

    if (
      candidate.location &&
      currentUser.location &&
      candidate.location
        .toLowerCase()
        .includes(currentUser.location.toLowerCase())
    ) {
      return "location_based";
    }

    if (candidate.followersCount > 1000) return "popular";

    return "algorithm";
  }

  private getCommonInterests(
    candidateInterests: string[],
    userInterests: string[]
  ): string[] {
    return candidateInterests
      .filter((interest) =>
        userInterests.some(
          (userInterest) =>
            userInterest.toLowerCase().includes(interest.toLowerCase()) ||
            interest.toLowerCase().includes(userInterest.toLowerCase())
        )
      )
      .slice(0, 3); // Máximo 3 intereses comunes
  }

  private async getRecentActivity(userId: string): Promise<string | undefined> {
    const recentPost = await PostModel.findOne({
      authorId: userId,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .select("content createdAt")
      .lean();

    if (recentPost) {
      const daysAgo = Math.floor(
        (Date.now() - new Date(recentPost.createdAt).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (daysAgo === 0) return "Publicó hoy";
      if (daysAgo === 1) return "Publicó ayer";
      if (daysAgo < 7) return `Publicó hace ${daysAgo} días`;
    }

    return undefined;
  }

  private applyDiversityFilter(
    suggestions: SuggestionUser[],
    limit: number
  ): SuggestionUser[] {
    const result: SuggestionUser[] = [];
    const reasonCount: Record<string, number> = {};
    const maxConsecutive = 2;

    for (const suggestion of suggestions) {
      if (result.length >= limit) break;

      const reason = suggestion.reason;
      const recentWithSameReason = result
        .slice(-maxConsecutive)
        .filter((s) => s.reason === reason).length;

      if (recentWithSameReason < maxConsecutive) {
        result.push(suggestion);
        reasonCount[reason] = (reasonCount[reason] || 0) + 1;
      }
    }

    // Si no tenemos suficientes, rellenar con los mejores scores sin restricción
    if (result.length < limit) {
      const remaining = suggestions.filter(
        (s) => !result.some((r) => r.id === s.id)
      );
      result.push(...remaining.slice(0, limit - result.length));
    }

    return result;
  }

  private generateRefreshToken(): string {
    return `refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
