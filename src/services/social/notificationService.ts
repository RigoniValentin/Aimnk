import { NotificationModel } from "@models/Social/Notification";

export class NotificationService {
  async create(params: {
    type: "like" | "comment" | "follow" | "mention";
    message: string;
    fromUserId: string;
    toUserId: string;
    postId?: string;
    commentId?: string;
  }) {
    return NotificationModel.create(params);
  }

  async list(toUserId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const items = await NotificationModel.find({ toUserId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await NotificationModel.countDocuments({ toUserId });
    return { items, page, limit, total };
  }

  async markRead(id: string) {
    await NotificationModel.findByIdAndUpdate(id, { isRead: true });
    return { ok: true };
  }

  async markAllRead(toUserId: string) {
    await NotificationModel.updateMany(
      { toUserId, isRead: false },
      { $set: { isRead: true } }
    );
    return { ok: true };
  }
}
