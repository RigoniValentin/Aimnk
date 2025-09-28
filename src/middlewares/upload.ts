import multer from "multer";
import path from "path";
import fs from "fs";

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

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB para avatars
});

export const uploadCover = multer({
  storage: coverStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB para covers
});
