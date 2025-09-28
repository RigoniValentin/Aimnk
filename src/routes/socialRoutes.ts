import { Router } from "express";
import { verifyToken } from "@middlewares/auth";
import { upload } from "@middlewares/upload";
import {
  postsLimiter,
  commentsLimiter,
  likesLimiter,
  followsLimiter,
} from "@middlewares/rateLimit";
import {
  createPost,
  getPost,
  deletePost,
  likePost,
  bookmarkPost,
  feed,
  explore,
  byHashtag,
  trending,
  sharePost,
} from "@controllers/social/postsController";
import {
  createComment,
  listPostComments,
  likeComment,
  deleteComment,
} from "@controllers/social/commentsController";
import {
  getMe,
  updateMe,
  getUserProfile,
  getUserByUsername,
  getUserPosts,
  searchUsers,
  uploadUserAvatar,
  uploadUserCover,
  checkUsernameAvailability,
  changeUsername,
  cleanBlobUrls,
} from "@controllers/social/usersController";
import { NotificationController } from "@controllers/social/notificationController";
import {
  followUser,
  unfollowUser,
  getFollowStats,
  listFollowers,
  listFollowing,
  suggestions,
} from "@controllers/social/followsController";
import { getUserSuggestions } from "@controllers/social/userSuggestionsController";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@controllers/social/notificationsController";
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  uploadCoverImage,
  addXP,
  getBadges,
  getStats,
  updateStatus,
  unlockBadge,
} from "@controllers/social/userProfileController";
import {
  uploadAvatar as uploadAvatarMiddleware,
  uploadCover as uploadCoverMiddleware,
} from "@middlewares/upload";

const router = Router();

// Posts
router.get("/posts/feed", verifyToken, feed);
router.get("/posts/explore", verifyToken, explore);
router.get("/posts/hashtag/:tag", verifyToken, byHashtag);
router.get("/posts/trending", verifyToken, trending);
router.post(
  "/posts",
  verifyToken,
  postsLimiter,
  upload.array("images", 4),
  createPost
);
router.get("/posts/:id", verifyToken, getPost);
router.get("/posts/user/:userId", getUserPosts); // 🆕 Endpoint para posts de usuario (público)
router.delete("/posts/:id", verifyToken, deletePost);
router.post("/posts/:id/like", verifyToken, likesLimiter, likePost);
router.post("/posts/:id/bookmark", verifyToken, bookmarkPost);
router.post("/posts/:id/share", verifyToken, sharePost);

// Comments
router.get("/posts/:postId/comments", verifyToken, listPostComments);
router.post("/comments", verifyToken, commentsLimiter, createComment);
router.post("/comments/:id/like", verifyToken, likesLimiter, likeComment);
router.delete("/comments/:id", verifyToken, deleteComment);

// Follows - Sistema completo de seguimiento
router.post("/follows", verifyToken, followsLimiter, followUser);
router.delete("/follows", verifyToken, followsLimiter, unfollowUser);
router.get("/follows/:userId/stats", verifyToken, getFollowStats);
router.get("/follows/:userId/followers", verifyToken, listFollowers);
router.get("/follows/:userId/following", verifyToken, listFollowing);
router.get("/follows/suggestions", verifyToken, suggestions);
router.get("/users/me", verifyToken, getMe);
router.put("/users/me", verifyToken, updateMe);
router.post(
  "/users/me/avatar",
  verifyToken,
  uploadAvatarMiddleware.single("avatar"),
  uploadUserAvatar
);
router.post(
  "/users/me/cover",
  verifyToken,
  uploadCoverMiddleware.single("cover"),
  uploadUserCover
);
router.get(
  "/users/username/:username/check",
  verifyToken,
  checkUsernameAvailability
);
router.put("/users/me/username", verifyToken, changeUsername);
router.post("/users/cleanup-blobs", verifyToken, cleanBlobUrls); // Endpoint de mantenimiento
router.get("/users/suggestions", verifyToken, getUserSuggestions); // 🎯 Sistema de sugerencias inteligente
router.get("/users/search", verifyToken, searchUsers);
router.get("/users/username/:username", verifyToken, getUserByUsername); // 🆕 Buscar por username
router.get("/users/:id/posts", verifyToken, getUserPosts);
router.get("/users/:id", verifyToken, getUserProfile);

// 🔔 Sistema Completo de Notificaciones en Tiempo Real
router.get(
  "/notifications",
  verifyToken,
  NotificationController.getNotifications
);
router.get(
  "/notifications/stats",
  verifyToken,
  NotificationController.getStats
);
router.patch(
  "/notifications/:id/read",
  verifyToken,
  NotificationController.markAsRead
);
router.patch(
  "/notifications/mark-all-read",
  verifyToken,
  NotificationController.markAllAsRead
);
router.delete(
  "/notifications/:id",
  verifyToken,
  NotificationController.deleteNotification
);
router.get(
  "/notifications/preferences",
  verifyToken,
  NotificationController.getPreferences
);
router.patch(
  "/notifications/preferences",
  verifyToken,
  NotificationController.updatePreferences
);
router.post(
  "/notifications/reset-preferences",
  verifyToken,
  NotificationController.resetPreferences
); // Solo desarrollo
router.post(
  "/notifications/test",
  verifyToken,
  NotificationController.createTestNotification
); // Solo desarrollo

// Profile routes
router.get("/profiles/:userId", verifyToken, getProfile);
router.put("/profiles/:userId", verifyToken, updateProfile);
router.post(
  "/profiles/:userId/avatar",
  verifyToken,
  uploadAvatarMiddleware.single("avatar"),
  uploadAvatar
);
router.post(
  "/profiles/:userId/cover",
  verifyToken,
  uploadCoverMiddleware.single("cover"),
  uploadCoverImage
);
router.post("/profiles/:userId/xp", verifyToken, addXP);
router.get("/profiles/:userId/badges", verifyToken, getBadges);
router.get("/profiles/:userId/stats", verifyToken, getStats);
router.post("/profiles/:userId/badges/:badgeId", verifyToken, unlockBadge);
router.put("/profiles/:userId/status", verifyToken, updateStatus);

export default router;
