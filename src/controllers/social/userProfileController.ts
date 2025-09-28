import { Request, Response } from "express";
import { z } from "zod";
import { UserProfileService } from "@services/social/userProfileService";
import { upload } from "@middlewares/upload";
import fs from "fs";
import path from "path";

const userProfileService = new UserProfileService();

// Schemas de validación
const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().optional().or(z.literal("")),
  birthDate: z.string().datetime().optional().or(z.literal("")),
  mood: z
    .object({
      current: z.string(),
      emoji: z.string(),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    })
    .optional(),
  interests: z.array(z.string().max(30)).max(10).optional(),
  socialLinks: z
    .object({
      instagram: z.string().url().optional().or(z.literal("")),
      twitter: z.string().url().optional().or(z.literal("")),
      linkedin: z.string().url().optional().or(z.literal("")),
      youtube: z.string().url().optional().or(z.literal("")),
    })
    .optional(),
  privacy: z
    .object({
      profileVisibility: z.enum(["public", "friends", "private"]).optional(),
      showEmail: z.boolean().optional(),
      showStats: z.boolean().optional(),
      allowMessages: z.boolean().optional(),
    })
    .optional(),
});

const AddXPSchema = z.object({
  amount: z.number().min(1).max(1000),
  source: z.string().min(1),
  metadata: z
    .object({
      experienceId: z.string().optional(),
      actionType: z.string().optional(),
    })
    .optional(),
});

const UnlockBadgeSchema = z.object({
  badgeId: z.string().min(1),
  progress: z
    .object({
      current: z.number().min(0),
      total: z.number().min(1),
    })
    .optional(),
});

// GET /api/profiles/{userId}
export const getProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;
    const requesterId = req.currentUser?.id;

    const profile = await userProfileService.getProfile(userId, requesterId);

    res.json({
      success: true,
      data: profile,
      message: "Perfil obtenido exitosamente",
    });
  } catch (error: any) {
    const statusCode = error.message.includes("no encontrado")
      ? 404
      : error.message.includes("privado") || error.message.includes("visible")
      ? 403
      : 500;

    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

// PUT /api/profiles/me
export const updateProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const parsed = UpdateProfileSchema.parse(req.body);
    const userId = req.currentUser.id;

    const updatedProfile = await userProfileService.updateProfile(
      userId,
      parsed
    );

    res.json({
      success: true,
      data: updatedProfile,
      message: "Perfil actualizado exitosamente",
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      res.status(400).json({
        success: false,
        message: "Datos inválidos",
        errors: error.errors,
      });
    } else {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
};

// POST /api/profiles/me/avatar
export const uploadAvatar = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: "No se recibió ninguna imagen",
      });
      return;
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const userId = req.currentUser.id;

    // Actualizar avatar en el usuario
    const { UserModel } = await import("@models/Users");
    await UserModel.findByIdAndUpdate(userId, { avatar: avatarUrl });

    res.json({
      success: true,
      data: { avatarUrl },
      message: "Avatar actualizado exitosamente",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// POST /api/profiles/me/cover
export const uploadCoverImage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: "No se recibió ninguna imagen",
      });
      return;
    }

    const coverUrl = `/uploads/covers/${req.file.filename}`;
    const userId = req.currentUser.id;

    await userProfileService.updateProfile(userId, { coverImage: coverUrl });

    res.json({
      success: true,
      data: { coverUrl },
      message: "Imagen de portada actualizada exitosamente",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET /api/profiles/{userId}/stats
export const getStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const stats = await userProfileService.getStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    const statusCode = error.message.includes("no encontradas") ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message,
    });
  }
};

// POST /api/profiles/me/xp
export const addXP = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = AddXPSchema.parse(req.body);
    const userId = req.currentUser.id;

    const result = await userProfileService.addXP(
      userId,
      parsed.amount,
      parsed.source,
      parsed.metadata
    );

    res.json({
      success: true,
      data: result,
      message: `${parsed.amount} XP agregado por ${parsed.source}`,
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      res.status(400).json({
        success: false,
        message: "Datos inválidos",
        errors: error.errors,
      });
    } else {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
};

// GET /api/profiles/{userId}/badges
export const getBadges = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const badges = await userProfileService.getUserBadges(userId);

    res.json({
      success: true,
      data: badges,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// POST /api/profiles/me/badges/unlock
export const unlockBadge = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const parsed = UnlockBadgeSchema.parse(req.body);
    const userId = req.currentUser.id;

    // Verificar que el usuario tiene permisos de admin (esto debería ser un middleware)
    const permissions = req.currentUser.permissions || [];
    const roles = req.currentUser.roles || [];

    if (
      !permissions.includes("admin") &&
      !roles.some((role: any) => role.name === "admin")
    ) {
      res.status(403).json({
        success: false,
        message: "Permisos insuficientes",
      });
      return;
    }

    const userBadge = await userProfileService.unlockBadge(
      userId,
      parsed.badgeId,
      parsed.progress
    );

    res.json({
      success: true,
      data: userBadge,
      message: "Badge desbloqueado exitosamente",
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      res.status(400).json({
        success: false,
        message: "Datos inválidos",
        errors: error.errors,
      });
    } else {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
};

// POST /api/profiles/me/status
export const updateStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { status } = req.body;
    const userId = req.currentUser.id;

    if (!["online", "away", "busy", "offline"].includes(status)) {
      res.status(400).json({
        success: false,
        message: "Estado inválido",
      });
      return;
    }

    const profile = await userProfileService.updateStatus(userId, status);

    res.json({
      success: true,
      data: { status: profile.status },
      message: "Estado actualizado exitosamente",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
