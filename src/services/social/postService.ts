import { PostModel } from "@models/Social/Post";
import { CommentModel } from "@models/Social/Comment";
import { LikeModel } from "@models/Social/Like";
import { BookmarkModel } from "@models/Social/Bookmark";
import { UserModel } from "@models/Users";
import {
  extractHashtags,
  extractMentions,
  sanitizeContent,
} from "./contentUtils";
import { Types } from "mongoose";

export class PostService {
  async createPost(
    authorId: string,
    content: string,
    images: string[],
    imageCropData?: any[],
    videoData?: {
      url: string;
      thumbnail: string;
      duration: number;
      size: number;
      format: string;
    }
  ) {
    const clean = sanitizeContent(content);
    const hashtags = extractHashtags(clean);
    const mentions = extractMentions(clean);

    const postData: any = {
      authorId: new Types.ObjectId(authorId),
      content: clean,
      images: images?.slice(0, 4) || [],
      imageCropData: imageCropData || [],
      hashtags,
      mentions,
    };

    // Si hay video, agregarlo al post
    if (videoData) {
      postData.video = videoData.url;
      postData.videoThumbnail = videoData.thumbnail;
      postData.videoDuration = videoData.duration;
      postData.videoSize = videoData.size;
      postData.videoFormat = videoData.format;
    }

    const post = await PostModel.create(postData);
    await UserModel.findByIdAndUpdate(authorId, { $inc: { postsCount: 1 } });
    return post;
  }

  async getPost(id: string) {
    console.log(`📄 Obteniendo post individual ${id} con autor populado`);

    const post = await PostModel.findById(id)
      .populate({
        path: "authorId",
        select:
          "username name email avatar bio isVerified followersCount followingCount createdAt",
        match: { isActive: { $ne: false } },
      })
      .lean();

    // Si el post existe pero no tiene autor (usuario eliminado), retornar null
    if (post && !post.authorId) {
      console.warn(`⚠️ Post ${id} encontrado pero autor eliminado`);
      return null;
    }

    return post;
  }

  async deletePost(id: string, userId: string) {
    const post = await PostModel.findById(id);
    if (!post) return null;
    if (String(post.authorId) !== String(userId)) return null;
    await PostModel.findByIdAndDelete(id);
    await LikeModel.deleteMany({ targetType: "post", targetId: id });
    await BookmarkModel.deleteMany({ postId: id });
    await CommentModel.deleteMany({ postId: id });
    await UserModel.findByIdAndUpdate(userId, { $inc: { postsCount: -1 } });
    return true;
  }

  async likeToggle(
    targetType: "post" | "comment",
    targetId: string,
    userId: string
  ) {
    const existing = await LikeModel.findOne({ targetType, targetId, userId });
    if (existing) {
      await existing.deleteOne();
      const inc = -1;
      if (targetType === "post")
        await PostModel.findByIdAndUpdate(targetId, {
          $inc: { likesCount: inc },
        });
      else
        await CommentModel.findByIdAndUpdate(targetId, {
          $inc: { likesCount: inc },
        });
      return { liked: false };
    } else {
      await LikeModel.create({ targetType, targetId, userId });
      const inc = 1;
      if (targetType === "post")
        await PostModel.findByIdAndUpdate(targetId, {
          $inc: { likesCount: inc },
        });
      else
        await CommentModel.findByIdAndUpdate(targetId, {
          $inc: { likesCount: inc },
        });
      return { liked: true };
    }
  }

  async bookmarkToggle(postId: string, userId: string) {
    const existing = await BookmarkModel.findOne({ postId, userId });
    if (existing) {
      await existing.deleteOne();
      return { bookmarked: false };
    } else {
      await BookmarkModel.create({ postId, userId });
      return { bookmarked: true };
    }
  }

  async feed(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    console.log("📡 Obteniendo feed con autores populados");

    const items = await PostModel.find({ isActive: true })
      .populate({
        path: "authorId",
        select:
          "username name email avatar bio isVerified followersCount followingCount createdAt",
        match: { isActive: { $ne: false } },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // Para mejor performance

    // Filtrar posts sin autor (en caso de usuarios eliminados)
    const itemsWithAuthors = items.filter((post) => post.authorId);

    console.log(
      `✅ Feed obtenido: ${itemsWithAuthors.length} posts con autores`
    );

    const total = await PostModel.countDocuments({ isActive: true });
    return { items: itemsWithAuthors, page, limit, total };
  }

  async explore(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    console.log("🔍 Obteniendo explore con autores populados");

    const items = await PostModel.find({ isActive: true })
      .populate({
        path: "authorId",
        select:
          "username name email avatar bio isVerified followersCount followingCount createdAt",
        match: { isActive: { $ne: false } },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const itemsWithAuthors = items.filter((post) => post.authorId);

    console.log(
      `✅ Explore obtenido: ${itemsWithAuthors.length} posts con autores`
    );

    const total = await PostModel.countDocuments({ isActive: true });
    return { items: itemsWithAuthors, page, limit, total };
  }

  async listByHashtag(tag: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    console.log(
      `🏷️ Obteniendo posts por hashtag #${tag} con autores populados`
    );

    const items = await PostModel.find({ isActive: true, hashtags: tag })
      .populate({
        path: "authorId",
        select:
          "username name email avatar bio isVerified followersCount followingCount createdAt",
        match: { isActive: { $ne: false } },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const itemsWithAuthors = items.filter((post) => post.authorId);

    console.log(
      `✅ Hashtag #${tag}: ${itemsWithAuthors.length} posts con autores`
    );

    const total = await PostModel.countDocuments({
      isActive: true,
      hashtags: tag,
    });
    return { items: itemsWithAuthors, page, limit, total };
  }

  async trending() {
    // Simple trending by likes in last 7 days
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const items = await PostModel.find({
      isActive: true,
      createdAt: { $gte: since },
    })
      .sort({ likesCount: -1, commentsCount: -1 })
      .limit(50);
    return items;
  }

  async share(postId: string) {
    await PostModel.findByIdAndUpdate(postId, { $inc: { sharesCount: 1 } });
    return { ok: true };
  }
}
