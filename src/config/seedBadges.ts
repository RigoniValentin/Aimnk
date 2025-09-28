import { BadgeModel } from "../models/Social/Badge";

const defaultBadges = [
  // Badges de bienvenida
  {
    name: "Bienvenido",
    description: "Te has unido a la comunidad AIMNK",
    icon: "welcome",
    color: "#4CAF50",
    category: "welcome",
    rarity: "common" as const,
    requirements: {
      type: "profile_created" as const,
      value: 1,
    },
  },
  {
    name: "Perfil Completo",
    description: "Has completado toda la información de tu perfil",
    icon: "profile-complete",
    color: "#2196F3",
    category: "profile",
    rarity: "uncommon" as const,
    requirements: {
      type: "profile_completed" as const,
      value: 1,
    },
  },

  // Badges de actividad
  {
    name: "Primera Pregunta",
    description: "Has hecho tu primera pregunta en el foro",
    icon: "first-question",
    color: "#FF9800",
    category: "activity",
    rarity: "common" as const,
    requirements: {
      type: "questions_created" as const,
      value: 1,
    },
  },
  {
    name: "Curioso",
    description: "Has hecho 10 preguntas",
    icon: "curious",
    color: "#FF5722",
    category: "activity",
    rarity: "uncommon" as const,
    requirements: {
      type: "questions_created" as const,
      value: 10,
    },
  },
  {
    name: "Explorador",
    description: "Has hecho 50 preguntas",
    icon: "explorer",
    color: "#E91E63",
    category: "activity",
    rarity: "rare" as const,
    requirements: {
      type: "questions_created" as const,
      value: 50,
    },
  },

  // Badges de nivel
  {
    name: "Principiante",
    description: "Has alcanzado el nivel 5",
    icon: "beginner",
    color: "#9C27B0",
    category: "level",
    rarity: "common" as const,
    requirements: {
      type: "level_reached" as const,
      value: 5,
    },
  },
  {
    name: "Intermedio",
    description: "Has alcanzado el nivel 15",
    icon: "intermediate",
    color: "#673AB7",
    category: "level",
    rarity: "uncommon" as const,
    requirements: {
      type: "level_reached" as const,
      value: 15,
    },
  },
  {
    name: "Avanzado",
    description: "Has alcanzado el nivel 30",
    icon: "advanced",
    color: "#3F51B5",
    category: "level",
    rarity: "rare" as const,
    requirements: {
      type: "level_reached" as const,
      value: 30,
    },
  },
  {
    name: "Experto",
    description: "Has alcanzado el nivel 50",
    icon: "expert",
    color: "#2196F3",
    category: "level",
    rarity: "epic" as const,
    requirements: {
      type: "level_reached" as const,
      value: 50,
    },
  },
  {
    name: "Maestro",
    description: "Has alcanzado el nivel 100",
    icon: "master",
    color: "#00BCD4",
    category: "level",
    rarity: "legendary" as const,
    requirements: {
      type: "level_reached" as const,
      value: 100,
    },
  },

  // Badges sociales
  {
    name: "Social",
    description: "Tienes 10 seguidores",
    icon: "social",
    color: "#4CAF50",
    category: "social",
    rarity: "uncommon" as const,
    requirements: {
      type: "followers_count" as const,
      value: 10,
    },
  },
  {
    name: "Influyente",
    description: "Tienes 100 seguidores",
    icon: "influencer",
    color: "#8BC34A",
    category: "social",
    rarity: "rare" as const,
    requirements: {
      type: "followers_count" as const,
      value: 100,
    },
  },
  {
    name: "Celebrity",
    description: "Tienes 1000 seguidores",
    icon: "celebrity",
    color: "#CDDC39",
    category: "social",
    rarity: "legendary" as const,
    requirements: {
      type: "followers_count" as const,
      value: 1000,
    },
  },

  // Badges de tiempo
  {
    name: "Veterano",
    description: "Llevas 6 meses en la comunidad",
    icon: "veteran",
    color: "#795548",
    category: "time",
    rarity: "rare" as const,
    requirements: {
      type: "days_since_registration" as const,
      value: 180,
    },
  },
  {
    name: "Leyenda",
    description: "Llevas 2 años en la comunidad",
    icon: "legend",
    color: "#607D8B",
    category: "time",
    rarity: "legendary" as const,
    requirements: {
      type: "days_since_registration" as const,
      value: 730,
    },
  },

  // Badges especiales
  {
    name: "Beta Tester",
    description: "Participaste en la fase beta de AIMNK",
    icon: "beta-tester",
    color: "#FF6B35",
    category: "special",
    rarity: "epic" as const,
    requirements: {
      type: "special_event" as const,
      value: 1,
    },
  },
  {
    name: "Colaborador",
    description: "Has contribuido al desarrollo de la plataforma",
    icon: "contributor",
    color: "#6C5CE7",
    category: "special",
    rarity: "legendary" as const,
    requirements: {
      type: "special_contribution" as const,
      value: 1,
    },
  },
];

export async function seedBadges() {
  try {
    console.log("🎖️ Iniciando seed de badges...");

    // Verificar si ya existen badges
    const existingBadges = await BadgeModel.countDocuments();
    if (existingBadges > 0) {
      console.log(`✅ Ya existen ${existingBadges} badges en la base de datos`);
      return;
    }

    // Crear los badges
    const createdBadges = await BadgeModel.insertMany(defaultBadges);
    console.log(`✅ Se crearon ${createdBadges.length} badges exitosamente`);

    return createdBadges;
  } catch (error) {
    console.error("❌ Error al crear badges:", error);
    throw error;
  }
}

export async function getBadgeById(id: string) {
  return await BadgeModel.findById(id);
}

export async function getAllBadges() {
  return await BadgeModel.find().sort({ rarity: 1, name: 1 });
}

export async function getBadgesByCategory(category: string) {
  return await BadgeModel.find({ category }).sort({ rarity: 1, name: 1 });
}
