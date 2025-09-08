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
} from "@controllers/social/commentsController";
import {
  getMe,
  updateMe,
  getUserProfile,
  getUserPosts,
  searchUsers,
} from "@controllers/social/usersController";
import {
  followUser,
  unfollowUser,
  listFollowers,
  listFollowing,
  suggestions,
} from "@controllers/social/followsController";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@controllers/social/notificationsController";

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
router.delete("/posts/:id", verifyToken, deletePost);
router.post("/posts/:id/like", verifyToken, likesLimiter, likePost);
router.post("/posts/:id/bookmark", verifyToken, bookmarkPost);
router.post("/posts/:id/share", verifyToken, sharePost);

// Comments
router.get("/posts/:postId/comments", verifyToken, listPostComments);
router.post("/comments", verifyToken, commentsLimiter, createComment);
router.post("/comments/:id/like", verifyToken, likesLimiter, likeComment);

// Follows
router.get("/users/:id/followers", verifyToken, listFollowers);
router.get("/users/:id/following", verifyToken, listFollowing);
router.post("/users/:id/follow", verifyToken, followsLimiter, followUser);
router.delete("/users/:id/follow", verifyToken, followsLimiter, unfollowUser);
router.get("/users/suggestions", verifyToken, suggestions);
router.get("/users/me", verifyToken, getMe);
router.put("/users/me", verifyToken, updateMe);
router.get("/users/:id/posts", verifyToken, getUserPosts);
router.get("/users/search", verifyToken, searchUsers);
router.get("/users/:id", verifyToken, getUserProfile);

// Notifications
router.get("/notifications", verifyToken, listNotifications);
router.put("/notifications/:id/read", verifyToken, markNotificationRead);
router.put("/notifications/read-all", verifyToken, markAllNotificationsRead);

export default router;
