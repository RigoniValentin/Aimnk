import { Request, Response } from "express";
import { z } from "zod";
import { UserModel } from "@models/Users";
import { PostModel } from "@models/Social/Post";

export const getMe = async (req: Request, res: Response): Promise<void> => {
  const user = await UserModel.findById(req.currentUser.id).select("-password");
  res.json({ success: true, data: user });
};

const UpdateMeSchema = z.object({
  name: z.string().min(1).optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
  locality: z.string().optional(),
  nationality: z.string().optional(),
});

export const updateMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = UpdateMeSchema.parse(req.body);
    const updated = await UserModel.findByIdAndUpdate(
      req.currentUser.id,
      data,
      { new: true }
    ).select("-password");
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const getUserProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  const user = await UserModel.findById(req.params.id).select("-password");
  if (!user) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }
  res.json({ success: true, data: user });
};

export const getUserPosts = async (
  req: Request,
  res: Response
): Promise<void> => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    PostModel.find({ authorId: req.params.id, isActive: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    PostModel.countDocuments({ authorId: req.params.id, isActive: true }),
  ]);
  res.json({
    success: true,
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  });
};

export const searchUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  const q = String(req.query.q || "").trim();
  if (!q) {
    res.json({ success: true, data: [] });
    return;
  }
  const users = await UserModel.find({
    $or: [
      { username: { $regex: q, $options: "i" } },
      { name: { $regex: q, $options: "i" } },
    ],
  })
    .limit(20)
    .select("username name avatar followersCount");
  res.json({ success: true, data: users });
};
