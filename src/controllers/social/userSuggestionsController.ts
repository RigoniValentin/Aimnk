import { Request, Response } from "express";
import { z } from "zod";
import { UserSuggestionsService } from "@services/social/userSuggestionsService";

const suggestionsService = new UserSuggestionsService();

// Schema de validación para query parameters - optimizado para comunidades pequeñas
const SuggestionsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(20).default(4), // Default más pequeño para comunidades pequeñas
  refresh: z.coerce.boolean().default(false),
  exclude_recent: z.coerce.number().min(0).max(30).default(3), // Más permisivo por defecto
  allowIncompleteProfiles: z.coerce.boolean().default(true),
  includeNewUsers: z.coerce.boolean().default(true),
});

export const getUserSuggestions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const startTime = Date.now();
    const currentUserId = req.currentUser.id;
    const {
      limit,
      refresh,
      exclude_recent,
      allowIncompleteProfiles,
      includeNewUsers,
    } = SuggestionsQuerySchema.parse(req.query);

    console.log(
      `🎯 Generando sugerencias (comunidad pequeña): user=${currentUserId}, limit=${limit}, refresh=${refresh}, excludeRecent=${exclude_recent}`
    );

    const result = await suggestionsService.generateSuggestions(
      currentUserId,
      limit,
      refresh,
      exclude_recent,
      allowIncompleteProfiles,
      includeNewUsers
    );

    const executionTime = Date.now() - startTime;

    console.log(
      `✅ Sugerencias generadas exitosamente: ${result.suggestions.length} usuarios en ${executionTime}ms`
    );

    res.json({
      success: true,
      data: result,
      meta: {
        total: result.suggestions.length,
        returned: result.suggestions.length,
        executionTime: `${executionTime}ms`,
      },
    });
  } catch (error: any) {
    console.error("❌ Error al generar sugerencias:", error);

    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: "Parámetros inválidos",
        details: error.errors,
      });
    } else if (error.message === "Usuario no encontrado") {
      res.status(404).json({
        success: false,
        error: "Usuario no encontrado",
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Error interno del servidor",
        message:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
};
