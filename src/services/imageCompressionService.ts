import sharp from "sharp";
import path from "path";
import fs from "fs";

export interface CompressionOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: "jpeg" | "webp" | "png";
  generateMultipleSizes?: boolean;
}

export interface ProcessedImage {
  original: string;
  compressed: string;
  thumbnail?: string;
  webp?: string;
  sizes: {
    original: number;
    compressed: number;
    reduction: string;
  };
}

export class ImageCompressionService {
  private ensureDir(dir: string) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Comprime una imagen con múltiples tamaños y formatos
   * Similar a WhatsApp/Instagram: Calidad alta pero tamaño mínimo
   */
  async compressImage(
    inputPath: string,
    outputDir: string,
    fileName: string,
    options: CompressionOptions = {}
  ): Promise<ProcessedImage> {
    const {
      quality = 85,
      maxWidth = 1920,
      maxHeight = 1920,
      format = "jpeg",
      generateMultipleSizes = true,
    } = options;

    this.ensureDir(outputDir);

    const baseName = path.parse(fileName).name;
    const originalStats = fs.statSync(inputPath);

    try {
      // 1. Imagen principal comprimida (como WhatsApp)
      const compressedPath = path.join(
        outputDir,
        `${baseName}-compressed.${format}`
      );

      let pipeline = sharp(inputPath).resize(maxWidth, maxHeight, {
        fit: "inside",
        withoutEnlargement: true,
      });

      // Aplicar compresión específica según formato
      if (format === "jpeg") {
        pipeline = pipeline.jpeg({
          quality,
          progressive: true,
          mozjpeg: true, // Mejor compresión
        });
      } else if (format === "webp") {
        pipeline = pipeline.webp({
          quality,
          effort: 6, // Máximo esfuerzo de compresión
        });
      } else if (format === "png") {
        pipeline = pipeline.png({
          quality,
          compressionLevel: 9,
        });
      }

      await pipeline.toFile(compressedPath);
      const compressedStats = fs.statSync(compressedPath);

      const result: ProcessedImage = {
        original: inputPath,
        compressed: compressedPath,
        sizes: {
          original: originalStats.size,
          compressed: compressedStats.size,
          reduction: `${(
            ((originalStats.size - compressedStats.size) / originalStats.size) *
            100
          ).toFixed(1)}%`,
        },
      };

      if (generateMultipleSizes) {
        // 2. Thumbnail (como las previews de WhatsApp)
        const thumbnailPath = path.join(
          outputDir,
          `${baseName}-thumb.${format}`
        );
        await sharp(inputPath)
          .resize(300, 300, {
            fit: "cover",
            position: "centre",
          })
          .jpeg({ quality: 70, progressive: true })
          .toFile(thumbnailPath);

        result.thumbnail = thumbnailPath;

        // 3. Versión WebP para navegadores modernos
        if (format !== "webp") {
          const webpPath = path.join(outputDir, `${baseName}-compressed.webp`);
          await sharp(inputPath)
            .resize(maxWidth, maxHeight, {
              fit: "inside",
              withoutEnlargement: true,
            })
            .webp({
              quality: quality + 5, // Un poco más de calidad en WebP
              effort: 6,
            })
            .toFile(webpPath);

          result.webp = webpPath;
        }
      }

      console.log(
        `🗜️ Imagen comprimida: ${result.sizes.original} → ${result.sizes.compressed} bytes (${result.sizes.reduction} reducción)`
      );

      return result;
    } catch (error) {
      console.error("❌ Error comprimiendo imagen:", error);
      throw error;
    }
  }

  /**
   * Compresión específica para avatares (círculos)
   */
  async compressAvatar(
    inputPath: string,
    outputDir: string,
    fileName: string
  ): Promise<ProcessedImage> {
    const baseName = path.parse(fileName).name;
    this.ensureDir(outputDir);

    const originalStats = fs.statSync(inputPath);

    // Avatar principal (400x400)
    const avatarPath = path.join(outputDir, `${baseName}-avatar.jpeg`);
    await sharp(inputPath)
      .resize(400, 400, {
        fit: "cover",
        position: "centre",
      })
      .jpeg({
        quality: 85,
        progressive: true,
        mozjpeg: true,
      })
      .toFile(avatarPath);

    // Avatar pequeño para listas (80x80)
    const thumbPath = path.join(outputDir, `${baseName}-thumb.jpeg`);
    await sharp(inputPath)
      .resize(80, 80, {
        fit: "cover",
        position: "centre",
      })
      .jpeg({
        quality: 75,
        progressive: true,
      })
      .toFile(thumbPath);

    const compressedStats = fs.statSync(avatarPath);

    return {
      original: inputPath,
      compressed: avatarPath,
      thumbnail: thumbPath,
      sizes: {
        original: originalStats.size,
        compressed: compressedStats.size,
        reduction: `${(
          ((originalStats.size - compressedStats.size) / originalStats.size) *
          100
        ).toFixed(1)}%`,
      },
    };
  }

  /**
   * Compresión específica para portadas
   */
  async compressCover(
    inputPath: string,
    outputDir: string,
    fileName: string
  ): Promise<ProcessedImage> {
    const baseName = path.parse(fileName).name;
    this.ensureDir(outputDir);

    const originalStats = fs.statSync(inputPath);

    // Portada principal (1920x600 - aspect ratio típico de portadas)
    const coverPath = path.join(outputDir, `${baseName}-cover.jpeg`);
    await sharp(inputPath)
      .resize(1920, 600, {
        fit: "cover",
        position: "centre",
      })
      .jpeg({
        quality: 90, // Un poco más de calidad para portadas
        progressive: true,
        mozjpeg: true,
      })
      .toFile(coverPath);

    // Preview pequeño
    const thumbPath = path.join(outputDir, `${baseName}-thumb.jpeg`);
    await sharp(inputPath)
      .resize(400, 125, {
        fit: "cover",
        position: "centre",
      })
      .jpeg({
        quality: 80,
        progressive: true,
      })
      .toFile(thumbPath);

    const compressedStats = fs.statSync(coverPath);

    return {
      original: inputPath,
      compressed: coverPath,
      thumbnail: thumbPath,
      sizes: {
        original: originalStats.size,
        compressed: compressedStats.size,
        reduction: `${(
          ((originalStats.size - compressedStats.size) / originalStats.size) *
          100
        ).toFixed(1)}%`,
      },
    };
  }

  /**
   * Compresión para posts de la red social
   */
  async compressPostImage(
    inputPath: string,
    outputDir: string,
    fileName: string
  ): Promise<ProcessedImage> {
    return this.compressImage(inputPath, outputDir, fileName, {
      quality: 85,
      maxWidth: 1080, // Resolución de Instagram
      maxHeight: 1080,
      format: "jpeg",
      generateMultipleSizes: true,
    });
  }

  /**
   * Limpia archivos temporales
   */
  async cleanup(filePaths: string[]) {
    for (const filePath of filePaths) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Archivo temporal eliminado: ${filePath}`);
        }
      } catch (error) {
        console.error(`❌ Error eliminando archivo ${filePath}:`, error);
      }
    }
  }

  /**
   * Obtiene metadatos de la imagen
   */
  async getImageMetadata(imagePath: string) {
    try {
      const metadata = await sharp(imagePath).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: fs.statSync(imagePath).size,
        hasAlpha: metadata.hasAlpha,
        channels: metadata.channels,
      };
    } catch (error) {
      console.error("❌ Error obteniendo metadatos:", error);
      return null;
    }
  }
}

export const imageCompressionService = new ImageCompressionService();
