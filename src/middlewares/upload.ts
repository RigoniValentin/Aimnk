import multer from "multer";
import path from "path";
import fs from "fs";
import { imageCompressionService } from "../services/imageCompressionService";

const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(process.cwd(), "uploads", "social");
    ensureDir(dest);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(
      null,
      `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
    );
  },
});

const fileFilter: multer.Options["fileFilter"] = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowed.includes(file.mimetype))
    return cb(new Error("Invalid file type"));
  cb(null, true);
};

// Filtro de archivos para videos
const videoFileFilter: multer.Options["fileFilter"] = (req, file, cb) => {
  const allowedVideo = [
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "video/x-msvideo",
  ];
  const allowedImage = ["image/jpeg", "image/png", "image/gif", "image/webp"];

  // Permitir tanto videos como imágenes
  if (
    !allowedVideo.includes(file.mimetype) &&
    !allowedImage.includes(file.mimetype)
  ) {
    return cb(
      new Error(
        "Tipo de archivo inválido. Solo se permiten videos (mp4, mov, webm) e imágenes"
      )
    );
  }
  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 }, // 16MB para uploads generales
});

// Upload específico para posts (soporta videos e imágenes)
const postStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Separar videos de imágenes en carpetas diferentes
    const isVideo = file.mimetype.startsWith("video/");
    const folder = isVideo ? "videos" : "social";
    const dest = path.join(process.cwd(), "uploads", folder);
    ensureDir(dest);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const prefix = file.mimetype.startsWith("video/")
      ? "video"
      : file.fieldname;
    cb(
      null,
      `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
    );
  },
});

export const uploadPost = multer({
  storage: postStorage,
  fileFilter: videoFileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB para videos antes de comprimir
});

// Storage específico para avatars
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(process.cwd(), "uploads", "avatars");
    ensureDir(dest);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

// Storage específico para covers
const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(process.cwd(), "uploads", "covers");
    ensureDir(dest);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `cover-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

export const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB para avatars
});

export const uploadCover = multer({
  storage: coverStorage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB para covers
});
