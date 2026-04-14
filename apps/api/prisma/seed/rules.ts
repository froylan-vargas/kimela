import { PrismaClient, Rule, SessionFormat } from "@prisma/client";

const RULES: { slug: string; question: string; sessionFormat: SessionFormat; minPoints: number; maxPoints: number }[] = [
  {
    slug: "session_winner",
    question: "¿Cuántos puntos obtiene el usuario si adivina el ganador del partido?",
    sessionFormat: SessionFormat.MATCHUP,
    minPoints: 1,
    maxPoints: 5,
  },
  {
    slug: "exact_session_result",
    question: "¿Cuántos puntos obtiene el usuario si adivina el resultado exacto del partido?",
    sessionFormat: SessionFormat.MATCHUP,
    minPoints: 0,
    maxPoints: 5,
  },
];

export async function seedRules(prisma: PrismaClient): Promise<Record<string, Rule>> {
  const results: Record<string, Rule> = {};

  for (const data of RULES) {
    const rule = await prisma.rule.upsert({
      where: { slug: data.slug },
      update: { question: data.question, sessionFormat: data.sessionFormat, minPoints: data.minPoints, maxPoints: data.maxPoints },
      create: data,
    });
    results[rule.slug] = rule;
    console.log(`  [rule] ${rule.slug}`);
  }

  return results;
}
