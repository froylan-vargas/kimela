import { PrismaClient, Sport } from "@prisma/client";

const SPORTS = [
  {
    name: "Fútbol soccer",
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/soccer.png",
  },
];

export async function seedSports(
  prisma: PrismaClient,
): Promise<Record<string, Sport>> {
  const results: Record<string, Sport> = {};

  for (const data of SPORTS) {
    const sport = await prisma.sport.upsert({
      where: { name: data.name },
      update: {},
      create: data,
    });
    results[sport.name] = sport;
    console.log(`  [sport] ${sport.name}`);
  }

  return results;
}
