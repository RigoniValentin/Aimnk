import { FollowModel } from "@models/Social/Follow";
import { UserModel } from "@models/Users";
import { Types } from "mongoose";

export class FollowService {
  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new Error("No puedes seguirte a ti mismo");
    }

    // Verificar que el usuario a seguir existe
    const targetUser = await UserModel.findById(followingId);
    if (!targetUser) {
      throw new Error("Usuario no encontrado");
    }

    // Verificar si ya lo sigue
    const existingFollow = await FollowModel.findOne({
      followerId,
      followingId,
    });

    if (existingFollow) {
      throw new Error("Ya sigues a este usuario");
    }

    // Crear la relación de seguimiento
    const created = await FollowModel.create({
      followerId: new Types.ObjectId(followerId),
      followingId: new Types.ObjectId(followingId),
    });

    // Actualizar contadores en paralelo
    await Promise.all([
      UserModel.findByIdAndUpdate(followerId, { $inc: { followingCount: 1 } }),
      UserModel.findByIdAndUpdate(followingId, { $inc: { followersCount: 1 } }),
    ]);

    // Obtener estadísticas actualizadas
    const [currentUser, updatedTargetUser, isFollowedByUser] =
      await Promise.all([
        UserModel.findById(followerId).select("followingCount"),
        UserModel.findById(followingId).select("followersCount"),
        FollowModel.findOne({
          followerId: followingId,
          followingId: followerId,
        }),
      ]);

    return {
      isFollowing: true,
      followersCount: updatedTargetUser?.followersCount || 0,
      followingCount: currentUser?.followingCount || 0,
      isFollowingUser: true,
      isFollowedByUser: !!isFollowedByUser,
    };
  }

  async unfollow(followerId: string, followingId: string) {
    // Verificar que el follow existe
    const existingFollow = await FollowModel.findOne({
      followerId,
      followingId,
    });

    if (!existingFollow) {
      throw new Error("No sigues a este usuario");
    }

    // Eliminar la relación de seguimiento
    await FollowModel.findOneAndDelete({
      followerId,
      followingId,
    });

    // Actualizar contadores en paralelo
    await Promise.all([
      UserModel.findByIdAndUpdate(followerId, { $inc: { followingCount: -1 } }),
      UserModel.findByIdAndUpdate(followingId, {
        $inc: { followersCount: -1 },
      }),
    ]);

    // Obtener estadísticas actualizadas
    const [currentUser, updatedTargetUser, isFollowedByUser] =
      await Promise.all([
        UserModel.findById(followerId).select("followingCount"),
        UserModel.findById(followingId).select("followersCount"),
        FollowModel.findOne({
          followerId: followingId,
          followingId: followerId,
        }),
      ]);

    return {
      isFollowing: false,
      followersCount: updatedTargetUser?.followersCount || 0,
      followingCount: currentUser?.followingCount || 0,
      isFollowingUser: false,
      isFollowedByUser: !!isFollowedByUser,
    };
  }

  async getFollowStats(userId: string, viewerId?: string) {
    // Obtener estadísticas del usuario
    const user = await UserModel.findById(userId).select(
      "followersCount followingCount"
    );
    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    let isFollowingUser = false;
    let isFollowedByUser = false;

    // Si hay un viewer, verificar relaciones
    if (viewerId && viewerId !== userId) {
      console.log(
        `🔍 Verificando relación entre viewer ${viewerId} y usuario ${userId}`
      );

      const [following, followedBy] = await Promise.all([
        FollowModel.findOne({ followerId: viewerId, followingId: userId }),
        FollowModel.findOne({ followerId: userId, followingId: viewerId }),
      ]);

      isFollowingUser = !!following;
      isFollowedByUser = !!followedBy;

      console.log(
        `🔍 Relaciones encontradas: viewer sigue al usuario=${isFollowingUser}, usuario sigue al viewer=${isFollowedByUser}`
      );
    } else {
      console.log(
        `🔍 Sin viewer o es el mismo usuario - no verificando relaciones`
      );
    }

    return {
      followersCount: user.followersCount || 0,
      followingCount: user.followingCount || 0,
      isFollowingUser,
      isFollowedByUser,
    };
  }

  async followers(
    userId: string,
    cursor?: string,
    limit: number = 20,
    viewerId?: string
  ) {
    // Query base
    let query: any = { followingId: userId };

    // Paginación por cursor (createdAt)
    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    // Obtener followers con información del usuario
    const follows = await FollowModel.find(query)
      .populate({
        path: "followerId",
        select: "username name avatar bio followersCount followingCount",
        match: { isActive: { $ne: false } },
      })
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

    // Filtrar follows con usuarios válidos
    const validFollows = follows.filter((follow) => follow.followerId);
    const hasMore = validFollows.length > limit;
    const followers = hasMore ? validFollows.slice(0, limit) : validFollows;

    // Si hay viewer, obtener qué usuarios sigue
    let viewerFollowings = new Set();
    if (viewerId && followers.length > 0) {
      const followerIds = followers.map((f) => (f.followerId as any)._id);
      const viewerFollows = await FollowModel.find({
        followerId: viewerId,
        followingId: { $in: followerIds },
      })
        .select("followingId")
        .lean();

      viewerFollowings = new Set(
        viewerFollows.map((f) => f.followingId.toString())
      );
    }

    // Formatear respuesta
    const users = followers.map((follow: any) => {
      const user = follow.followerId;
      return {
        id: user._id.toString(),
        username: user.username,
        name: user.name,
        avatar: user.avatar || null,
        bio: user.bio || null,
        isFollowing: viewerFollowings.has(user._id.toString()),
        followedAt: follow.createdAt.toISOString(),
      };
    });

    // Obtener total de followers
    const total = await FollowModel.countDocuments({ followingId: userId });
    const nextCursor = hasMore
      ? followers[followers.length - 1].createdAt.toISOString()
      : null;

    return {
      users,
      total,
      hasMore,
      nextCursor,
    };
  }

  async following(
    userId: string,
    cursor?: string,
    limit: number = 20,
    viewerId?: string
  ) {
    // Query base
    let query: any = { followerId: userId };

    // Paginación por cursor (createdAt)
    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    // Obtener following con información del usuario
    const follows = await FollowModel.find(query)
      .populate({
        path: "followingId",
        select: "username name avatar bio followersCount followingCount",
        match: { isActive: { $ne: false } },
      })
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

    // Filtrar follows con usuarios válidos
    const validFollows = follows.filter((follow) => follow.followingId);
    const hasMore = validFollows.length > limit;
    const following = hasMore ? validFollows.slice(0, limit) : validFollows;

    // Si hay viewer, obtener qué usuarios sigue
    let viewerFollowings = new Set();
    if (viewerId && following.length > 0) {
      const followingIds = following.map((f) => (f.followingId as any)._id);
      const viewerFollows = await FollowModel.find({
        followerId: viewerId,
        followingId: { $in: followingIds },
      })
        .select("followingId")
        .lean();

      viewerFollowings = new Set(
        viewerFollows.map((f) => f.followingId.toString())
      );
    }

    // Formatear respuesta
    const users = following.map((follow: any) => {
      const user = follow.followingId;
      return {
        id: user._id.toString(),
        username: user.username,
        name: user.name,
        avatar: user.avatar || null,
        bio: user.bio || null,
        isFollowing: viewerFollowings.has(user._id.toString()),
        followedAt: follow.createdAt.toISOString(),
      };
    });

    // Obtener total de following
    const total = await FollowModel.countDocuments({ followerId: userId });
    const nextCursor = hasMore
      ? following[following.length - 1].createdAt.toISOString()
      : null;

    return {
      users,
      total,
      hasMore,
      nextCursor,
    };
  }

  async suggestions(userId: string, limit: number = 10) {
    // Obtener usuarios que el usuario actual NO sigue y que no son él mismo
    const followingIds = await FollowModel.find({ followerId: userId })
      .select("followingId")
      .lean();

    const excludeIds = [
      new Types.ObjectId(userId),
      ...followingIds.map((f) => f.followingId),
    ];

    // Obtener usuarios sugeridos (por ejemplo, los más activos)
    const suggestedUsers = await UserModel.find({
      _id: { $nin: excludeIds },
      isActive: { $ne: false },
    })
      .select("username name avatar bio followersCount")
      .sort({ followersCount: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    const users = suggestedUsers.map((user) => ({
      id: user._id.toString(),
      username: user.username,
      name: user.name,
      avatar: user.avatar || null,
      bio: user.bio || null,
      followersCount: user.followersCount || 0,
      isFollowing: false, // Por definición, no los sigue
    }));

    return {
      users,
      total: users.length,
    };
  }
}
