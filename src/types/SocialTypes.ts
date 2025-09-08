export type UUID = string;

export interface SocialApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface PostDoc {
  id: UUID;
  content: string;
  images: string[];
  authorId: UUID;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  hashtags: string[];
  mentions: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentDoc {
  id: UUID;
  content: string;
  authorId: UUID;
  postId: UUID;
  parentCommentId?: UUID;
  likesCount: number;
  repliesCount: number;
  mentions: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LikeDoc {
  id: UUID;
  userId: UUID;
  targetType: "post" | "comment";
  targetId: UUID;
  createdAt: Date;
}

export interface FollowDoc {
  id: UUID;
  followerId: UUID;
  followingId: UUID;
  createdAt: Date;
}

export interface BookmarkDoc {
  id: UUID;
  userId: UUID;
  postId: UUID;
  createdAt: Date;
}

export interface NotificationDoc {
  id: UUID;
  type: "like" | "comment" | "follow" | "mention";
  message: string;
  fromUserId: UUID;
  toUserId: UUID;
  postId?: UUID;
  commentId?: UUID;
  isRead: boolean;
  createdAt: Date;
}

export type CursorPage<T> = {
  items: T[];
  nextCursor?: string;
};
