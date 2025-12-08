import { Request, Response, NextFunction } from "express";
import { videoCompressionService } from "@services/videoCompressionService";
import path from "path";
import fs from "fs";

interface MulterFile extends Express.Multer.File {}

/**
 * Middleware para comprimir videos en posts
 * Se ejecuta después de multer y antes del controlador
 */
export const compressPostVideo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const files = (req as any).files as MulterFile[];

    if (!files || files.length === 0) {
      return next();
    }

    // Separar videos de imágenes
    const videoFiles = files.filter((f) => f.mimetype.startsWith("video/"));
    const imageFiles = files.filter((f) => f.mimetype.startsWith("image/"));

    console.log(
      `🎬 Procesando archivos - Videos: ${videoFiles.length}, Imágenes: ${imageFiles.length}`
    );

    // Validar que solo haya 1 video o múltiples imágenes, no ambos
    if (videoFiles.length > 0 && imageFiles.length > 0) {
      // Limpiar archivos subidos
      await cleanupFiles(files);
      res.status(400).json({
        success: false,
        message:
          "No puedes subir videos e imágenes en el mismo post. Elige uno u otro.",
      });
      return;
    }

    // Validar máximo 1 video
    if (videoFiles.length > 1) {
      await cleanupFiles(files);
      res.status(400).json({
        success: false,
        message: "Solo puedes subir 1 video por post",
      });
      return;
    }

    // Si no hay videos, continuar (las imágenes se procesan en otro middleware)
    if (videoFiles.length === 0) {
      return next();
    }

    const videoFile = videoFiles[0];
    console.log(`🎥 Procesando video: ${videoFile.filename}`);

    // Validar video
    const validation = await videoCompressionService.validateVideo(
      videoFile.path
    );
    if (!validation.valid) {
      await cleanupFiles(files);
      res.status(400).json({
        success: false,
        message: validation.error || "Video inválido",
      });
      return;
    }

    // Comprimir video y generar thumbnail
    const result = await videoCompressionService.compressVideo(videoFile.path);

    console.log(`✅ Video procesado exitosamente:
      - Original: ${(result.originalSize / (1024 * 1024)).toFixed(2)}MB
      - Comprimido: ${(result.size / (1024 * 1024)).toFixed(2)}MB
      - Reducción: ${result.compressionRatio.toFixed(1)}%
      - Duración: ${result.duration.toFixed(2)}s`);

    // Actualizar req con información del video procesado
    (req as any).processedVideo = {
      path: result.videoPath,
      thumbnail: result.thumbnailPath,
      duration: result.duration,
      size: result.size,
      format: result.format,
      url: `/uploads/videos/${path.basename(result.videoPath)}`,
      thumbnailUrl: `/uploads/videos/${path.basename(result.thumbnailPath)}`,
    };

    next();
  } catch (error: any) {
    console.error("❌ Error en compresión de video:", error);

    // Limpiar archivos en caso de error
    const files = (req as any).files as MulterFile[];
    if (files) {
      await cleanupFiles(files);
    }

    res.status(500).json({
      success: false,
      message: "Error procesando video: " + error.message,
    });
  }
};

/**
 * Helper para limpiar archivos
 */
async function cleanupFiles(files: MulterFile[]): Promise<void> {
  for (const file of files) {
    try {
      if (fs.existsSync(file.path)) {
        await fs.promises.unlink(file.path);
        console.log(`🗑️ Archivo limpiado: ${file.filename}`);
      }
    } catch (err) {
      console.error(`⚠️ Error limpiando archivo ${file.filename}:`, err);
    }
  }
}
