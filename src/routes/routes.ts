import { Router } from "express";
import {
  findUsers,
  findUserById,
  createUser,
  updateUser,
  deleteUser,
  getUsersSubscriptionInfo,
} from "@controllers/userController";
import {
  findRoles,
  findRolesById,
  createRoles,
  updateRoles,
  deleteRoles,
} from "@controllers/rolesController";
import {
  loginUser,
  refreshToken,
  registerUser,
  forgotPassword,
  resetPassword,
  validateResetToken,
} from "@controllers/auth/authControllers";
import { getPermissions, verifyToken } from "@middlewares/auth";
import { checkRoles } from "@middlewares/roles";
import { checkSubscription } from "@middlewares/checkSubscription";
// Importar rutas de la tienda
import {
  applyCoupon,
  cancelPayment,
  captureOrder,
  capturePreference,
  createOrder,
  createPreference,
  getSubscriptionInfo,
  extendUserSubscription,
} from "@controllers/paymentController";
import { sendResetPasswordEmail } from "@services/emailService";

import { get } from "mongoose";
import stationsRoutes from "./stationsRoutes";
import socialRoutes from "./socialRoutes";
import testRoutes from "./testRoutes";
import pushNotificationRoutes from "./pushNotificationRoutes";
import { NotificationController } from "@controllers/social/notificationController";
import {
  getMe,
  uploadUserAvatar,
  uploadUserCover,
} from "@controllers/social/usersController";
import {
  createComment,
  listPostComments,
  likeComment,
  deleteComment,
} from "@controllers/social/commentsController";
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
  getUserPosts,
} from "@controllers/social/usersController";
import {
  postsLimiter,
  commentsLimiter,
  likesLimiter,
} from "@middlewares/rateLimit";
import { upload } from "@middlewares/upload";
import {
  listAllQna,
  listMineQna,
  createQna,
  listPendingQna,
  listAnsweredQna,
  answerQna,
} from "@controllers/qnaController";

const router = Router();

export default () => {
  router.get("/health", (req, res) => {
    res.send("Api is healthy");
  });

  //#region Auth Routes
  router.post("/auth/register", checkRoles, registerUser);
  router.post("/auth/login", loginUser);
  router.get(
    "/auth/refresh",
    verifyToken,
    (req, res, next) => {
      res.set("Cache-Control", "no-store");
      next();
    },
    refreshToken
  );
  router.post("/auth/forgot-password", forgotPassword);
  router.post("/auth/validate-reset-token", validateResetToken);
  router.post("/auth/reset-password", resetPassword);
  //#endregion

  //#region User Routes
  router.get("/users", verifyToken, getPermissions, findUsers);
  router.get(
    "/users/subscription-info",
    verifyToken,
    getPermissions,
    getUsersSubscriptionInfo
  );
  router.get("/users/:id", verifyToken, getPermissions, findUserById);
  router.post("/users", verifyToken, getPermissions, checkRoles, createUser);
  router.put("/users/:id", verifyToken, getPermissions, updateUser);
  router.delete("/users/:id", verifyToken, getPermissions, deleteUser);
  //#endregion

  //#region Roles Routes
  router.get("/roles", verifyToken, getPermissions, findRoles);
  router.get("/roles/:id", verifyToken, getPermissions, findRolesById);
  router.post("/roles", /*verifyToken, getPermissions,*/ createRoles);
  router.put("/roles/:id", verifyToken, getPermissions, updateRoles);
  router.delete("/roles/:id", verifyToken, getPermissions, deleteRoles);
  //#endregion

  // #region Payments Routes
  router.get("/create-order", verifyToken, createOrder);
  router.get("/capture-order", captureOrder);
  router.get("/cancel-order", cancelPayment);
  // Alias de compatibilidad usado por el proyecto que funciona
  router.get("/cancel-payment", cancelPayment);

  router.post("/create-preference", verifyToken, createPreference);
  router.get("/capture-preference", capturePreference);
  // #endregion

  // #region Email Routes
  // Route para enviar email a través del helper
  router.post("/send-email", async (req, res) => {
    const { to, subject, text } = req.body;
    try {
      await sendResetPasswordEmail(to, text);
      res.status(200).send(`Email sent to: ${to}`);
    } catch (error) {
      res.status(500).send("Error sending email");
    }
  });
  // #endregion

  // #region Coupons Routes
  router.post("/apply-coupon", verifyToken, applyCoupon);
  router.get("/subscription-info", verifyToken, getSubscriptionInfo);
  router.post(
    "/admin/extend-subscription",
    verifyToken,
    extendUserSubscription
  );
  // #endregion

  // #region Stations Routes
  // Monta todas las rutas de estaciones bajo /api/v1/stations
  router.use("/stations", stationsRoutes);
  // #endregion

  // #region Direct Notification Routes (for frontend compatibility)
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
  router.post(
    "/notifications/:id/read",
    verifyToken,
    NotificationController.markAsRead
  );
  router.post(
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
  router.put(
    "/notifications/preferences",
    verifyToken,
    NotificationController.updatePreferences
  );
  router.post(
    "/notifications/reset-preferences",
    verifyToken,
    NotificationController.resetPreferences
  );
  router.post(
    "/notifications/test",
    verifyToken,
    NotificationController.createTestNotification
  );
  // #endregion

  // #region Direct User Profile Routes (for frontend compatibility)
  router.get("/users/profile", verifyToken, getMe);
  router.get("/profiles/me", verifyToken, getMe);
  router.post(
    "/users/upload-avatar",
    verifyToken,
    upload.single("avatar"),
    uploadUserAvatar
  );
  router.post(
    "/users/me/avatar",
    verifyToken,
    upload.single("avatar"),
    uploadUserAvatar
  );
  router.post(
    "/users/upload-cover",
    verifyToken,
    upload.single("cover"),
    uploadUserCover
  );
  router.post(
    "/users/me/cover",
    verifyToken,
    upload.single("cover"),
    uploadUserCover
  );
  // #endregion

  // #region Direct Comments Routes (for frontend compatibility)
  router.get("/posts/:postId/comments", verifyToken, listPostComments);
  router.get("/comments/post/:postId", verifyToken, listPostComments);  // Alternative route that frontend is using
  router.post("/comments", verifyToken, commentsLimiter, createComment);
  router.post("/comments/:id/like", verifyToken, likesLimiter, likeComment);
  router.delete("/comments/:id", verifyToken, deleteComment);
  // #endregion

  // #region Direct Posts Routes (for frontend compatibility)
  router.get("/posts/feed", verifyToken, feed);
  router.get("/posts/explore", verifyToken, explore);
  router.get("/posts/hashtag/:tag", verifyToken, byHashtag);
  router.get("/posts/trending", verifyToken, trending);
  router.post("/posts", verifyToken, upload.array("media", 10), postsLimiter, createPost);
  router.get("/posts/:id", verifyToken, getPost);
  router.get("/posts/user/:userId", getUserPosts);
  router.get("/users/:id/posts", verifyToken, getUserPosts);
  router.delete("/posts/:id", verifyToken, deletePost);
  router.post("/posts/:id/like", verifyToken, likesLimiter, likePost);
  router.post("/posts/:id/bookmark", verifyToken, bookmarkPost);
  router.post("/posts/:id/share", verifyToken, sharePost);
  // #endregion

  // #region Social (Comunidad) Routes
  router.use("/SER", socialRoutes);
  // #endregion

  // #region Test Routes
  router.use("/test", testRoutes);
  // #endregion

  // #region Push Notifications Routes
  router.use("/push", pushNotificationRoutes);
  // #endregion

  // #region QnA Routes
  // Público
  router.get("/qna", listAllQna);
  // Autenticado (user/admin)
  router.get("/qna/mine", verifyToken, listMineQna);
  router.post("/qna", verifyToken, createQna);
  // Admin
  router.get("/qna/admin/pending", verifyToken, listPendingQna);
  router.get("/qna/admin/answered", verifyToken, listAnsweredQna);
  router.post("/qna/admin/answer/:id", verifyToken, answerQna);
  // #endregion

  return router;
};
