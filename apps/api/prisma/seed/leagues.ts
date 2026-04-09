import { PrismaClient, League, Sport } from "@prisma/client";

const LEAGUES: { name: string; sport: string }[] = [
  // Fútbol
  { name: "Liga MX", sport: "Fútbol soccer" },
  { name: "Mundial", sport: "Fútbol soccer" },
];

export async function seedLeagues(
  prisma: PrismaClient,
  sports: Record<string, Sport>,
): Promise<Record<string, League>> {
  const results: Record<string, League> = {};

  for (const data of LEAGUES) {
    const sport = sports[data.sport];
    if (!sport) throw new Error(`Sport not found in seed: "${data.sport}"`);

    const league = await prisma.league.upsert({
      where: { name_sportId: { name: data.name, sportId: sport.id } },
      update: {},
      create: { name: data.name, sportId: sport.id },
    });
    results[league.name] = league;
    console.log(`  [league] ${league.name}`);
  }

  return results;
}
