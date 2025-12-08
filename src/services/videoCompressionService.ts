import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import path from "path";
import fs from "fs";
import { promisify } from "util";

// Configurar FFmpeg
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const unlink = promisify(fs.unlink);
const stat = promisify(fs.stat);

interface VideoCompressionResult {
  videoPath: string;
  thumbnailPath: string;
  duration: number;
  size: number;
  format: string;
  originalSize: number;
  compressionRatio: number;
}

interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  format: string;
  size: number;
  bitrate: number;
}

export class VideoCompressionService {
  private readonly MAX_DURATION = 30; // 30 segundos máximo
  private readonly MAX_SIZE_MB = 100; // 100MB máximo para upload original
  private readonly TARGET_SIZE_MB = 10; // 10MB target para video comprimido (como Instagram)
  private readonly MAX_WIDTH = 1080; // Resolución máxima 1080p
  private readonly TARGET_BITRATE = "2000k"; // 2Mbps bitrate objetivo
  private readonly THUMBNAIL_TIME = "00:00:01"; // Captura thumbnail en segundo 1

  /**
   * Obtiene metadata del video
   */
  private getVideoMetadata(filePath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          console.error("❌ Error obteniendo metadata del video:", err);
          return reject(err);
        }

        const videoStream = metadata.streams.find(
          (s) => s.codec_type === "video"
        );
        if (!videoStream) {
          return reject(new Error("No se encontró stream de video"));
        }

        const duration = metadata.format.duration || 0;
        const size = metadata.format.size || 0;
        const bitrate = metadata.format.bit_rate || 0;

        resolve({
          duration,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          format: metadata.format.format_name || "unknown",
          size,
          bitrate,
        });
      });
    });
  }

  /**
   * Valida que el video cumpla con los requisitos
   */
  async validateVideo(
    filePath: string
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      const stats = await stat(filePath);
      const fileSizeMB = stats.size / (1024 * 1024);

      console.log(`📊 Tamaño del archivo: ${fileSizeMB.toFixed(2)}MB`);

      if (fileSizeMB > this.MAX_SIZE_MB) {
        return {
          valid: false,
          error: `El video excede el tamaño máximo de ${this.MAX_SIZE_MB}MB`,
        };
      }

      const metadata = await this.getVideoMetadata(filePath);
      console.log(`⏱️ Duración del video: ${metadata.duration.toFixed(2)}s`);

      if (metadata.duration > this.MAX_DURATION) {
        return {
          valid: false,
          error: `El video excede la duración máxima de ${this.MAX_DURATION} segundos`,
        };
      }

      return { valid: true };
    } catch (error: any) {
      console.error("❌ Error validando video:", error);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Comprime el video optimizándolo para web
   */
  async compressVideo(inputPath: string): Promise<VideoCompressionResult> {
    try {
      console.log("🎥 Iniciando compresión de video:", inputPath);

      // Obtener metadata original
      const metadata = await this.getVideoMetadata(inputPath);
      const originalStats = await stat(inputPath);
      const originalSize = originalStats.size;

      console.log(
        `📊 Video original - Duración: ${metadata.duration.toFixed(
          2
        )}s, Tamaño: ${(originalSize / (1024 * 1024)).toFixed(2)}MB`
      );

      // Validar duración
      if (metadata.duration > this.MAX_DURATION) {
        throw new Error(
          `Video excede duración máxima de ${this.MAX_DURATION}s`
        );
      }

      const outputDir = path.dirname(inputPath);
      const baseName = path.basename(inputPath, path.extname(inputPath));

      // Paths de salida
      const compressedPath = path.join(outputDir, `${baseName}-compressed.mp4`);
      const thumbnailPath = path.join(outputDir, `${baseName}-thumb.jpg`);

      // Calcular escala si excede MAX_WIDTH
      let scaleFilter = "";
      if (metadata.width > this.MAX_WIDTH) {
        scaleFilter = `scale=${this.MAX_WIDTH}:-2`;
      }

      // Comprimir video con H.264 para máxima compatibilidad
      await new Promise<void>((resolve, reject) => {
        let command = ffmpeg(inputPath)
          .output(compressedPath)
          .videoCodec("libx264") // H.264 codec (universal)
          .audioCodec("aac") // AAC audio codec
          .audioBitrate("128k") // Audio bitrate
          .videoBitrate(this.TARGET_BITRATE) // Video bitrate
          .outputOptions([
            "-preset fast", // Preset de compresión (fast, medium, slow)
            "-crf 23", // Constant Rate Factor (18-28, menor = mejor calidad)
            "-movflags +faststart", // Optimización para streaming web
            "-pix_fmt yuv420p", // Formato de pixel compatible
            "-profile:v baseline", // Perfil H.264 baseline para máxima compatibilidad
            "-level 3.0", // Nivel H.264
          ]);

        // Aplicar escala si es necesario
        if (scaleFilter) {
          command = command.videoFilters(scaleFilter);
        }

        command
          .on("start", (cmd) => {
            console.log("🚀 Comando FFmpeg:", cmd);
          })
          .on("progress", (progress) => {
            console.log(`⏳ Progreso: ${progress.percent?.toFixed(1)}%`);
          })
          .on("end", () => {
            console.log("✅ Compresión completada");
            resolve();
          })
          .on("error", (err) => {
            console.error("❌ Error en compresión:", err);
            reject(err);
          })
          .run();
      });

      // Generar thumbnail
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .screenshots({
            timestamps: [this.THUMBNAIL_TIME],
            filename: path.basename(thumbnailPath),
            folder: path.dirname(thumbnailPath),
            size: `${this.MAX_WIDTH}x?`, // Mantener aspect ratio
          })
          .on("end", () => {
            console.log("✅ Thumbnail generado");
            resolve();
          })
          .on("error", (err) => {
            console.error("❌ Error generando thumbnail:", err);
            reject(err);
          });
      });

      // Obtener tamaño del archivo comprimido
      const compressedStats = await stat(compressedPath);
      const compressedSize = compressedStats.size;
      const compressionRatio =
        ((originalSize - compressedSize) / originalSize) * 100;

      console.log(
        `✅ Video comprimido: ${(originalSize / (1024 * 1024)).toFixed(
          2
        )}MB → ${(compressedSize / (1024 * 1024)).toFixed(
          2
        )}MB (${compressionRatio.toFixed(1)}% reducción)`
      );

      // Eliminar archivo original
      try {
        await unlink(inputPath);
        console.log("🗑️ Archivo original eliminado");
      } catch (err) {
        console.warn("⚠️ No se pudo eliminar archivo original:", err);
      }

      return {
        videoPath: compressedPath,
        thumbnailPath,
        duration: metadata.duration,
        size: compressedSize,
        format: "mp4",
        originalSize,
        compressionRatio,
      };
    } catch (error: any) {
      console.error("❌ Error en compresión de video:", error);
      throw error;
    }
  }

  /**
   * Genera solo un thumbnail del video sin comprimir
   */
  async generateThumbnail(videoPath: string): Promise<string> {
    try {
      const outputDir = path.dirname(videoPath);
      const baseName = path.basename(videoPath, path.extname(videoPath));
      const thumbnailPath = path.join(outputDir, `${baseName}-thumb.jpg`);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(videoPath)
          .screenshots({
            timestamps: [this.THUMBNAIL_TIME],
            filename: path.basename(thumbnailPath),
            folder: path.dirname(thumbnailPath),
            size: `${this.MAX_WIDTH}x?`,
          })
          .on("end", () => {
            console.log("✅ Thumbnail generado");
            resolve();
          })
          .on("error", (err) => {
            console.error("❌ Error generando thumbnail:", err);
            reject(err);
          });
      });

      return thumbnailPath;
    } catch (error: any) {
      console.error("❌ Error generando thumbnail:", error);
      throw error;
    }
  }

  /**
   * Elimina archivos de video y thumbnail
   */
  async cleanupVideoFiles(
    videoPath?: string,
    thumbnailPath?: string
  ): Promise<void> {
    try {
      if (videoPath && fs.existsSync(videoPath)) {
        await unlink(videoPath);
        console.log("🗑️ Video eliminado:", videoPath);
      }
      if (thumbnailPath && fs.existsSync(thumbnailPath)) {
        await unlink(thumbnailPath);
        console.log("🗑️ Thumbnail eliminado:", thumbnailPath);
      }
    } catch (error) {
      console.error("❌ Error limpiando archivos de video:", error);
    }
  }
}

export const videoCompressionService = new VideoCompressionService();
