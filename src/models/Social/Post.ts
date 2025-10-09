import mongoose, { Schema } from "mongoose";

const PostSchema = new Schema(
  {
    content: { type: String, required: true, minlength: 1, maxlength: 1000 }, // Aumentado de 500 a 1000
    images: {
      type: [String],
      default: [],
      validate: (arr: string[]) => arr.length <= 4,
    },
    imageCropData: [
      {
        x: { type: Number, default: 50 }, // Posición X en porcentaje (0-100)
        y: { type: Number, default: 50 }, // Posición Y en porcentaje (0-100)
        scale: { type: Number, default: 100 }, // Escala en porcentaje (50-200)
      },
    ],
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },
    hashtags: { type: [String], default: [], index: true },
    mentions: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false }
);

// Índices para optimización de consultas
PostSchema.index({ createdAt: -1 });
PostSchema.index({ hashtags: 1, createdAt: -1 });
PostSchema.index({ isActive: 1, createdAt: -1 }); // Para feed optimizado
PostSchema.index({ authorId: 1, isActive: 1, createdAt: -1 }); // Para posts de usuario

export const PostModel = mongoose.model("Post", PostSchema);
