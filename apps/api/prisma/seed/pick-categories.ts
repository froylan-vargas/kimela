import { PrismaClient, Sport, PickCategoryValueType } from "@prisma/client";

interface PickCategoryData {
  name: string;
  label: string;
  valueType: PickCategoryValueType;
  points: number;
  isDefault: boolean;
}

const PICK_CATEGORIES: Record<string, PickCategoryData[]> = {
  "futbol-soccer": [
    // Default — aplica a todas las sesiones
    {
      name: "score_home",
      label: "Goles local",
      valueType: "SCALAR",
      points: 1,
      isDefault: true,
    },
    {
      name: "score_away",
      label: "Goles visitante",
      valueType: "SCALAR",
      points: 1,
      isDefault: true,
    },
    // Opcionales — se asignan manualmente a sesiones de playoffs
    {
      name: "extra_time",
      label: "¿Tiempo extra?",
      valueType: "SCALAR", // "Y" | "N"
      points: 1,
      isDefault: false,
    },
    {
      name: "penalty_shootout",
      label: "¿Penales?",
      valueType: "SCALAR", // "Y" | "N"
      points: 1,
      isDefault: false,
    },
  ],
};

export async function seedPickCategories(
  prisma: PrismaClient,
  sports: Record<string, Sport>,
): Promise<void> {
  for (const [sportName, categories] of Object.entries(PICK_CATEGORIES)) {
    const sport = sports[sportName];
    if (!sport) {
      console.warn(
        `  [pick-category] sport not found: ${sportName} — skipping`,
      );
      continue;
    }

    for (const data of categories) {
      await prisma.pickCategory.upsert({
        where: { sportId_name: { sportId: sport.id, name: data.name } },
        update: {
          label: data.label,
          points: data.points,
          isDefault: data.isDefault,
        },
        create: { ...data, sportId: sport.id },
      });
      console.log(`  [pick-category] ${sportName} / ${data.name}`);
    }
  }
}
