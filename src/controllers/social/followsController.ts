import { Request, Response } from "express";
import { FollowService } from "@services/social/followService";

const service = new FollowService();

export const followUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const created = await service.follow(req.currentUser.id, req.params.id);
    res.json({ success: true, data: created });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const unfollowUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const ok = await service.unfollow(req.currentUser.id, req.params.id);
  res.json({ success: true, data: ok });
};

export const listFollowers = async (
  req: Request,
  res: Response
): Promise<void> => {
  const data = await service.followers(req.params.id);
  res.json({ success: true, data });
};

export const listFollowing = async (
  req: Request,
  res: Response
): Promise<void> => {
  const data = await service.following(req.params.id);
  res.json({ success: true, data });
};

export const suggestions = async (
  req: Request,
  res: Response
): Promise<void> => {
  const data = await service.suggestions(req.currentUser.id);
  res.json({ success: true, data });
};
