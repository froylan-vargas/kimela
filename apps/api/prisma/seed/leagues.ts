import { PrismaClient, League, Sport } from "@prisma/client";

const LEAGUES: { slug: string; name: string; sport: string }[] = [
  // Fútbol
  { slug: "liga-mx", name: "Liga MX", sport: "futbol-soccer" },
  { slug: "mundial", name: "Mundial", sport: "futbol-soccer" },
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
      where: { slug_sportId: { slug: data.slug, sportId: sport.id } },
      update: { name: data.name },
      create: { slug: data.slug, name: data.name, sportId: sport.id },
    });
    results[league.slug] = league;
    console.log(`  [league] ${league.slug}`);
  }

  return results;
}
