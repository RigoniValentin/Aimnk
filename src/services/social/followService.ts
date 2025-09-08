import { FollowModel } from "@models/Social/Follow";
import { UserModel } from "@models/Users";

export class FollowService {
  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) throw new Error("Cannot follow yourself");
    const created = await FollowModel.findOneAndUpdate(
      { followerId, followingId },
      {},
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await UserModel.findByIdAndUpdate(followerId, {
      $inc: { followingCount: 1 },
    });
    await UserModel.findByIdAndUpdate(followingId, {
      $inc: { followersCount: 1 },
    });
    return created;
  }

  async unfollow(followerId: string, followingId: string) {
    await FollowModel.findOneAndDelete({ followerId, followingId });
    await UserModel.findByIdAndUpdate(followerId, {
      $inc: { followingCount: -1 },
    });
    await UserModel.findByIdAndUpdate(followingId, {
      $inc: { followersCount: -1 },
    });
    return { ok: true };
  }

  async followers(userId: string) {
    return FollowModel.find({ followingId: userId });
  }

  async following(userId: string) {
    return FollowModel.find({ followerId: userId });
  }

  async suggestions(userId: string, limit = 10) {
    // naive suggestions: users you don't follow
    const following = await FollowModel.find({ followerId: userId }).select(
      "followingId"
    );
    const excluded = new Set([
      userId,
      ...following.map((f) => String(f.followingId)),
    ]);
    return UserModel.find({ _id: { $nin: Array.from(excluded) } })
      .sort({ followersCount: -1 })
      .limit(limit)
      .select("username name avatar followersCount");
  }
}
