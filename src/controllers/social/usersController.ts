import { Request, Response } from "express";
import { z } from "zod";
import { UserModel } from "@models/Users";
import { PostModel } from "@models/Social/Post";
import { LikeModel } from "@models/Social/Like";
import { BookmarkModel } from "@models/Social/Bookmark";
import path from "path";

export const getMe = async (req: Request, res: Response): Promise<void> => {
  const user = await UserModel.findById(req.currentUser.id).select("-password");
  res.json({ success: true, data: user });
};

const UpdateMeSchema = z.object({
  name: z.string().min(1).optional(),
  bio: z.string().max(500).optional(),
  locality: z.string().optional(),
  nationality: z.string().optional(),

  // Nuevos campos para el sistema de perfiles completo
  location: z.string().optional(),
  website: z.string().url().or(z.literal("")).optional(),
  birthDate: z.string().datetime().optional(),
  // NOTA: avatar y coverImage se manejan por endpoints separados de upload

  mood: z
    .object({
      current: z.string().optional(),
      emoji: z.string().optional(),
      color: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional(),
    })
    .optional(),

  socialLinks: z
    .object({
      instagram: z.string().url().or(z.literal("")).optional(),
      twitter: z.string().url().or(z.literal("")).optional(),
      linkedin: z.string().url().or(z.literal("")).optional(),
      youtube: z.string().url().or(z.literal("")).optional(),
    })
    .optional(),

  interests: z.array(z.string()).max(20).optional(),

  privacy: z
    .object({
      profileVisibility: z.enum(["public", "friends", "private"]).optional(),
      showEmail: z.boolean().optional(),
      showStats: z.boolean().optional(),
      allowMessages: z.boolean().optional(),
    })
    .optional(),
});

export const updateMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = UpdateMeSchema.parse(req.body);

    // Procesar campos especiales
    const updateData: any = { ...data };

    // Si se actualiza mood, establecer timestamp
    if (data.mood) {
      updateData.mood = {
        ...data.mood,
        updatedAt: new Date(),
      };
    }

    // Convertir birthDate de string a Date si se proporciona
    if (data.birthDate) {
      updateData.birthDate = new Date(data.birthDate);
    }

    // Validar interests como array de strings no vacíos
    if (data.interests) {
      updateData.interests = data.interests.filter(
        (interest) => typeof interest === "string" && interest.trim().length > 0
      );
    }

    // ⚠️ IMPORTANTE: No permitir blob URLs en avatar/coverImage
    // Estas se manejan exclusivamente por endpoints de upload separados
    if (updateData.avatar && updateData.avatar.startsWith("blob:")) {
      console.warn(
        "🚨 Blob URL detectada en avatar, ignorando:",
        updateData.avatar
      );
      delete updateData.avatar;
    }
    if (updateData.coverImage && updateData.coverImage.startsWith("blob:")) {
      console.warn(
        "🚨 Blob URL detectada en coverImage, ignorando:",
        updateData.coverImage
      );
      delete updateData.coverImage;
    }

    console.log("💾 Actualizando perfil:", updateData);

    const updated = await UserModel.findByIdAndUpdate(
      req.currentUser.id,
      updateData,
      { new: true }
    ).select("-password");

    res.json({ success: true, data: updated });
  } catch (err: any) {
    if (err.name === "ZodError") {
      res.status(400).json({
        success: false,
        message: "Datos de entrada inválidos",
        errors: err.errors,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
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

export const getUserByUsername = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { username } = req.params;

    // Validación básica del username
    if (!username || username.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: "Username inválido",
        error: "INVALID_USERNAME",
      });
      return;
    }

    console.log(`🔍 Buscando usuario por username: ${username}`);

    // Buscar usuario por username (case-insensitive)
    const user = await UserModel.findOne({
      username: { $regex: new RegExp(`^${username}$`, "i") },
      isActive: { $ne: false }, // Solo usuarios activos
    }).select("-password -resetPasswordToken -resetPasswordExpires");

    if (!user) {
      console.log(`❌ Usuario no encontrado: ${username}`);
      res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
        error: "USER_NOT_FOUND",
      });
      return;
    }

    console.log(`✅ Usuario encontrado: ${user.username} (ID: ${user._id})`);

    // Respuesta con toda la información pública del perfil
    res.json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        location: user.location,
        website: user.website,
        birthDate: user.birthDate,
        coverImage: user.coverImage,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        postsCount: user.postsCount || 0,
        createdAt: user.createdAt,
        interests: user.interests || [],
        socialLinks: user.socialLinks || {},
        mood: user.mood || null,
        privacy: user.privacy || {
          showEmail: false,
          showBirthDate: false,
          allowMessages: true,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error al buscar usuario por username:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: "INTERNAL_SERVER_ERROR",
    });
  }
};

export const getUserPosts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Validar userId
    const userId = req.params.userId || req.params.id;
    if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
      res.status(400).json({
        success: false,
        message: "ID de usuario inválido",
        error: "INVALID_USER_ID",
      });
      return;
    }

    // Parsear parámetros con límites del FE
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 12))); // Default 12, máx 50
    const skip = (page - 1) * limit;

    console.log(
      `� Obteniendo posts del usuario ${userId} - Página ${page}, Límite ${limit}`
    );

    // Obtener posts y total en paralelo
    const [posts, total] = await Promise.all([
      PostModel.find({ authorId: userId, isActive: true })
        .populate({
          path: "authorId",
          select:
            "username name email avatar bio followersCount followingCount postsCount createdAt updatedAt",
          match: { isActive: { $ne: false } },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PostModel.countDocuments({ authorId: userId, isActive: true }),
    ]);

    // Filtrar posts sin autor
    const validPosts = posts.filter((post) => post.authorId);

    // Obtener información de likes y bookmarks si hay usuario autenticado
    let userLikes = new Set();
    let userBookmarks = new Set();
    const currentUserId = req.currentUser?.id;

    if (currentUserId && validPosts.length > 0) {
      const postIds = validPosts.map((p) => p._id);

      const [likes, bookmarks] = await Promise.all([
        LikeModel.find({
          userId: currentUserId,
          targetType: "post",
          targetId: { $in: postIds },
        })
          .select("targetId")
          .lean(),
        BookmarkModel.find({
          userId: currentUserId,
          postId: { $in: postIds },
        })
          .select("postId")
          .lean(),
      ]);

      userLikes = new Set(likes.map((like: any) => like.targetId.toString()));
      userBookmarks = new Set(
        bookmarks.map((bookmark: any) => bookmark.postId.toString())
      );
    }

    // Transformar datos al formato esperado por el FE (incluyendo campos originales para compatibilidad)
    const transformedPosts = validPosts.map((post: any) => {
      const author = post.authorId; // Ya viene populado
      return {
        // ✅ Campos originales (compatibilidad con FE existente)
        _id: post._id,
        content: post.content,
        images: post.images || [],
        imageCropData: post.imageCropData || [],
        authorId: author, // Objeto completo populado
        likesCount: post.likesCount || 0,
        commentsCount: post.commentsCount || 0,
        sharesCount: post.sharesCount || 0,
        hashtags: post.hashtags || [],
        mentions: post.mentions || [],
        isActive: post.isActive,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,

        // ✅ Campos transformados (formato nuevo del FE)
        id: post._id.toString(),
        author: {
          id: author._id.toString(),
          username: author.username,
          name: author.name,
          avatar: author.avatar || null,
          email: author.email,
          bio: author.bio || null,
          followersCount: author.followersCount || 0,
          followingCount: author.followingCount || 0,
          postsCount: author.postsCount || 0,
          createdAt: author.createdAt?.toISOString(),
          updatedAt: author.updatedAt?.toISOString(),
        },
        likes: post.likesCount || 0,
        comments: post.commentsCount || 0,
        shares: post.sharesCount || 0,

        // ✅ Estados de interacción
        isLiked: userLikes.has(post._id.toString()),
        isBookmarked: userBookmarks.has(post._id.toString()),
      };
    });

    console.log(
      `✅ Posts transformados: ${transformedPosts.length}/${total} total`
    );

    // Respuesta con formato exacto del FE
    res.json({
      success: true,
      data: transformedPosts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("❌ Error al obtener posts del usuario:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: "INTERNAL_SERVER_ERROR",
    });
  }
};

export const searchUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const q = String(req.query.q || "").trim();

    if (!q) {
      res.json({
        success: true,
        data: [],
        meta: {
          total: 0,
          query: "",
        },
      });
      return;
    }

    // Buscar usuarios por nombre o username (case insensitive)
    const users = await UserModel.find({
      $and: [
        // Solo usuarios activos
        { isActive: { $ne: false } }, // Incluir usuarios sin campo isActive o con true
        // Excluir al usuario actual si está autenticado
        ...(req.currentUser?.id ? [{ _id: { $ne: req.currentUser.id } }] : []),
        // Buscar en name o username
        {
          $or: [
            { name: { $regex: q, $options: "i" } },
            { username: { $regex: q, $options: "i" } },
          ],
        },
      ],
    })
      .select(
        "name username email avatar bio followersCount followingCount postsCount isVerified createdAt updatedAt"
      )
      .limit(20) // Limitar resultados
      .sort({ followersCount: -1, createdAt: -1 }); // Ordenar por popularidad y recencia

    res.json({
      success: true,
      data: users,
      meta: {
        total: users.length,
        query: q,
      },
    });
  } catch (error: any) {
    console.error("Error searching users:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

// Upload avatar para el usuario actual
export const uploadUserAvatar = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: "No se proporcionó ningún archivo de avatar",
      });
      return;
    }

    // Construir la URL completa del avatar
    const baseUrl =
      process.env.NODE_ENV === "production"
        ? process.env.HOST
        : `http://localhost:${process.env.PORT || 3013}`;
    const avatarUrl = `${baseUrl}/uploads/avatars/${req.file.filename}`;

    console.log("🖼️ Avatar guardado:", avatarUrl);

    // Actualizar el usuario con la nueva URL del avatar
    const updated = await UserModel.findByIdAndUpdate(
      req.currentUser.id,
      { avatar: avatarUrl },
      { new: true }
    ).select("-password");

    if (!updated) {
      res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
      return;
    }

    res.json({
      success: true,
      data: updated,
      message: "Avatar actualizado exitosamente",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error al subir avatar",
      error: error.message,
    });
  }
};

// Upload cover image para el usuario actual
export const uploadUserCover = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: "No se proporcionó ningún archivo de portada",
      });
      return;
    }

    // Construir la URL completa de la portada
    const baseUrl =
      process.env.NODE_ENV === "production"
        ? process.env.HOST
        : `http://localhost:${process.env.PORT || 3013}`;
    const coverUrl = `${baseUrl}/uploads/covers/${req.file.filename}`;

    console.log("🖼️ Cover guardado:", coverUrl);

    // Actualizar el usuario con la nueva URL de portada
    const updated = await UserModel.findByIdAndUpdate(
      req.currentUser.id,
      { coverImage: coverUrl },
      { new: true }
    ).select("-password");

    if (!updated) {
      res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
      return;
    }

    res.json({
      success: true,
      data: updated,
      message: "Portada actualizada exitosamente",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error al subir portada",
      error: error.message,
    });
  }
};

// Esquema de validación para cambio de username
const ChangeUsernameSchema = z.object({
  username: z
    .string()
    .min(3, "El username debe tener al menos 3 caracteres")
    .max(30, "El username no puede tener más de 30 caracteres")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "El username solo puede contener letras, números y guiones bajos"
    ),
});

// Verificar disponibilidad de username
export const checkUsernameAvailability = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { username } = req.params;

    // Validar formato del username
    const validationResult = ChangeUsernameSchema.safeParse({ username });
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        available: false,
        message: validationResult.error.errors[0].message,
      });
      return;
    }

    // Verificar si el username ya existe
    const existingUser = await UserModel.findOne({ username });
    const isAvailable =
      !existingUser || String(existingUser._id) === req.currentUser.id;

    res.json({
      success: true,
      available: isAvailable,
      message: isAvailable ? "Username disponible" : "Username ya está en uso",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      available: false,
      message: "Error al verificar disponibilidad",
      error: error.message,
    });
  }
};

// Limpiar blob URLs de la base de datos (función de utilidad/mantenimiento)
export const cleanBlobUrls = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Buscar usuarios con blob URLs
    const usersWithBlobs = await UserModel.find({
      $or: [
        { avatar: { $regex: /^blob:/ } },
        { coverImage: { $regex: /^blob:/ } },
      ],
    });

    console.log(
      `🔍 Encontrados ${usersWithBlobs.length} usuarios con blob URLs`
    );

    // Limpiar blob URLs
    const cleanupPromises = usersWithBlobs.map(async (user) => {
      const updateFields: any = {};

      if (user.avatar && user.avatar.startsWith("blob:")) {
        updateFields.avatar = "";
        console.log(`🧹 Limpiando avatar blob de usuario ${user.username}`);
      }

      if (user.coverImage && user.coverImage.startsWith("blob:")) {
        updateFields.coverImage = "";
        console.log(`🧹 Limpiando cover blob de usuario ${user.username}`);
      }

      if (Object.keys(updateFields).length > 0) {
        return UserModel.findByIdAndUpdate(user._id, updateFields);
      }
    });

    await Promise.all(cleanupPromises);

    res.json({
      success: true,
      message: `Limpiadas blob URLs de ${usersWithBlobs.length} usuarios`,
      cleanedUsers: usersWithBlobs.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error al limpiar blob URLs",
      error: error.message,
    });
  }
};

// Cambiar username del usuario actual
export const changeUsername = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const data = ChangeUsernameSchema.parse(req.body);
    const { username } = data;

    // Verificar si el username ya existe y no es del usuario actual
    const existingUser = await UserModel.findOne({ username });
    if (existingUser && String(existingUser._id) !== req.currentUser.id) {
      res.status(400).json({
        success: false,
        message: "El username ya está en uso por otro usuario",
      });
      return;
    }

    // Actualizar el username
    const updated = await UserModel.findByIdAndUpdate(
      req.currentUser.id,
      { username },
      { new: true }
    ).select("-password");

    if (!updated) {
      res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
      return;
    }

    res.json({
      success: true,
      data: updated,
      message: "Username actualizado exitosamente",
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      res.status(400).json({
        success: false,
        message: "Datos de entrada inválidos",
        errors: error.errors,
      });
    } else if (error.code === 11000) {
      // Error de duplicado de MongoDB
      res.status(400).json({
        success: false,
        message: "El username ya está en uso",
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: error.message,
      });
    }
  }
};
