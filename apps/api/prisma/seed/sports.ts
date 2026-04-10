import { PrismaClient, SessionFormat, Sport } from "@prisma/client";

const SPORTS: {
  slug: string;
  name: string;
  imgUrl: string;
  sessionFormat: SessionFormat;
}[] = [
  {
    slug: "futbol-soccer",
    name: "Fútbol soccer",
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/soccer.png",
    sessionFormat: SessionFormat.MATCHUP,
  },
];

export async function seedSports(
  prisma: PrismaClient,
): Promise<Record<string, Sport>> {
  const results: Record<string, Sport> = {};

  for (const data of SPORTS) {
    const sport = await prisma.sport.upsert({
      where: { name: data.name },
      update: { slug: data.slug, imgUrl: data.imgUrl },
      create: data,
    });
    results[sport.slug] = sport;
    console.log(`  [sport] ${sport.slug}`);
  }

  return results;
}
