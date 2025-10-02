import { Request, Response, NextFunction } from "express";
import { imageCompressionService } from "../services/imageCompressionService";
import path from "path";
import fs from "fs";

interface CompressedFile extends Express.Multer.File {
  compressedPath?: string;
  thumbnailPath?: string;
  webpPath?: string;
  compressionStats?: {
    originalSize: number;
    compressedSize: number;
    reduction: string;
  };
}

/**
 * Middleware para comprimir imágenes después del upload
 * Se ejecuta después de multer
 */
export const compressImages = (type: "post" | "avatar" | "cover" = "post") => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Si no hay archivos, continuar
      if (!req.file && !req.files) {
        return next();
      }

      const files: Express.Multer.File[] = [];

      if (req.file) {
        files.push(req.file);
      }

      if (req.files && Array.isArray(req.files)) {
        files.push(...req.files);
      }

      console.log(
        `🗜️ Iniciando compresión de ${files.length} archivo(s) tipo: ${type}`
      );

      const processedFiles: CompressedFile[] = [];

      for (const file of files) {
        try {
          const inputPath = file.path;
          const outputDir = path.dirname(inputPath);
          const fileName = file.filename;

          console.log(
            `📸 Comprimiendo: ${fileName} (${(file.size / 1024 / 1024).toFixed(
              2
            )}MB)`
          );

          let result;

          // Aplicar compresión específica según el tipo
          switch (type) {
            case "avatar":
              result = await imageCompressionService.compressAvatar(
                inputPath,
                outputDir,
                fileName
              );
              break;
            case "cover":
              result = await imageCompressionService.compressCover(
                inputPath,
                outputDir,
                fileName
              );
              break;
            case "post":
            default:
              result = await imageCompressionService.compressPostImage(
                inputPath,
                outputDir,
                fileName
              );
              break;
          }

          // Actualizar el objeto file con las rutas comprimidas
          const compressedFile: CompressedFile = {
            ...file,
            compressedPath: result.compressed,
            thumbnailPath: result.thumbnail,
            webpPath: result.webp,
            compressionStats: {
              originalSize: result.sizes.original,
              compressedSize: result.sizes.compressed,
              reduction: result.sizes.reduction,
            },
          };

          // Reemplazar el archivo original con el comprimido
          if (fs.existsSync(result.compressed)) {
            // Eliminar el archivo original
            fs.unlinkSync(inputPath);

            // Renombrar el archivo comprimido para que tenga el nombre original
            fs.renameSync(result.compressed, inputPath);

            console.log(`✅ Archivo comprimido reemplazado: ${fileName}`);
          }

          processedFiles.push(compressedFile);
        } catch (error) {
          console.error(
            `❌ Error comprimiendo archivo ${file.filename}:`,
            error
          );
          // En caso de error, mantener el archivo original
          processedFiles.push(file as CompressedFile);
        }
      }

      // Actualizar req con los archivos procesados
      if (req.file) {
        req.file = processedFiles[0];
      }

      if (req.files && Array.isArray(req.files)) {
        req.files = processedFiles;
      }

      // Agregar estadísticas de compresión a la request para logging
      (req as any).compressionStats = processedFiles
        .filter((f) => f.compressionStats)
        .map((f) => ({
          filename: f.filename,
          ...f.compressionStats,
        }));

      next();
    } catch (error) {
      console.error("❌ Error en middleware de compresión:", error);
      // En caso de error crítico, continuar sin compresión
      next();
    }
  };
};

/**
 * Middleware específico para posts
 */
export const compressPostImages = compressImages("post");

/**
 * Middleware específico para avatares
 */
export const compressAvatarImage = compressImages("avatar");

/**
 * Middleware específico para portadas
 */
export const compressCoverImage = compressImages("cover");

/**
 * Middleware para limpiar archivos temporales
 */
export const cleanupTempFiles = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Limpiar al final de la respuesta
  res.on("finish", () => {
    const compressionStats = (req as any).compressionStats;
    if (compressionStats) {
      console.log("📊 Estadísticas de compresión:", {
        files: compressionStats.length,
        totalReduction:
          compressionStats.reduce((acc: number, stat: any) => {
            const reduction = parseFloat(stat.reduction.replace("%", ""));
            return acc + reduction;
          }, 0) / compressionStats.length,
      });
    }
  });

  next();
};
