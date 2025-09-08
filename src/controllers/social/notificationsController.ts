import { Request, Response } from "express";
import { NotificationService } from "@services/social/notificationService";

const service = new NotificationService();

export const listNotifications = async (
  req: Request,
  res: Response
): Promise<void> => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const result = await service.list(req.currentUser.id, page, limit);
  res.json({
    success: true,
    data: result.items,
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit),
      hasNextPage: page * limit < result.total,
      hasPrevPage: page > 1,
    },
  });
};

export const markNotificationRead = async (
  req: Request,
  res: Response
): Promise<void> => {
  const result = await service.markRead(req.params.id);
  res.json({ success: true, data: result });
};

export const markAllNotificationsRead = async (
  req: Request,
  res: Response
): Promise<void> => {
  const result = await service.markAllRead(req.currentUser.id);
  res.json({ success: true, data: result });
};
