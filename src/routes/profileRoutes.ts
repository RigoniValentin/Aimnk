import { Router } from "express";
import { verifyToken } from "@middlewares/auth";
import { uploadAvatar, uploadCover } from "@middlewares/upload";
import {
  getProfile,
  updateProfile,
  uploadAvatar as uploadAvatarController,
  uploadCoverImage,
  getStats,
  addXP,
  getBadges,
  unlockBadge,
  updateStatus,
} from "@controllers/social/userProfileController";

const router = Router();

// Rutas de perfiles
router.get("/:userId", verifyToken, getProfile);
router.put("/me", verifyToken, updateProfile);

// Rutas de imágenes
router.post(
  "/me/avatar",
  verifyToken,
  uploadAvatar.single("avatar"),
  uploadAvatarController
);
router.post(
  "/me/cover",
  verifyToken,
  uploadCover.single("cover"),
  uploadCoverImage
);

// Rutas de estadísticas
router.get("/:userId/stats", verifyToken, getStats);
router.post("/me/xp", verifyToken, addXP);

// Rutas de badges
router.get("/:userId/badges", getBadges);
router.post("/me/badges/unlock", verifyToken, unlockBadge);

// Rutas de estado
router.post("/me/status", verifyToken, updateStatus);

export default router;
