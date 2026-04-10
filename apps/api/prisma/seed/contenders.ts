import { PrismaClient, League } from "@prisma/client";

// Fixed UUIDs guarantee idempotent upserts — Contender has no unique name constraint.
const CONTENDERS: {
  id: string;
  name: string;
  imgUrl: string;
  leagues: string[];
}[] = [
  // ── Liga MX ────────────────────────────────────────────────────────────────
  {
    id: "83b143c5-dc24-47b2-be04-b9dd740102ca",
    name: "Atlas",
    leagues: ["liga-mx"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/mx/atlas.png",
  },
  {
    id: "b8fabf20-a068-41ef-89c3-b2f628f732b7",
    name: "San Luis",
    leagues: ["liga-mx"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/mx/sanluis.png",
  },
  {
    id: "f0f14031-a0d1-4e0d-9178-5d8fdb741424",
    name: "América",
    leagues: ["liga-mx"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/mx/america.png",
  },
  {
    id: "7066ea56-a45e-46da-9222-c1a17833428e",
    name: "Cruz Azul",
    leagues: ["liga-mx"],
    imgUrl:
      "https://ik.imagekit.io/2252lb1or/qimela/contenders/mx/cruzazul.png",
  },
  {
    id: "e654f704-78f1-42c9-a69e-6456b5efc39a",
    name: "FC Juárez",
    leagues: ["liga-mx"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/mx/juarez.png",
  },
  {
    id: "5887c036-6979-4797-8c9e-4932e0452103",
    name: "Chivas",
    leagues: ["liga-mx"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/mx/chivas.png",
  },
  {
    id: "904b1e66-6c19-4146-9b9d-c711e1a628f5",
    name: "León",
    leagues: ["liga-mx"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/mx/leon.png",
  },
  {
    id: "c1581ca4-1752-4655-925e-db3233e5be67",
    name: "Mazatlán FC",
    leagues: ["liga-mx"],
    imgUrl:
      "https://ik.imagekit.io/2252lb1or/qimela/contenders/mx/mazatlan.png",
  },
  {
    id: "474f3493-e416-416c-a9c3-5af552aedd83",
    name: "Monterrey",
    leagues: ["liga-mx"],
    imgUrl:
      "https://ik.imagekit.io/2252lb1or/qimela/contenders/mx/monterrey.png",
  },
  {
    id: "5560247f-ace3-48ca-a0cc-90ef926f1b5b",
    name: "Necaxa",
    leagues: ["liga-mx"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/mx/necaxa.png",
  },
  {
    id: "8ab4a1d8-0f7b-464e-b001-22e9365adca7",
    name: "Pachuca",
    leagues: ["liga-mx"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/mx/pachuca.png",
  },
  {
    id: "a5b227ad-63ac-4e4f-bddd-28ddf5b2cb95",
    name: "Puebla",
    leagues: ["liga-mx"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/mx/puebla.png",
  },
  {
    id: "ecaf29cd-89b8-4ce0-8192-6b4fdd55b95b",
    name: "Pumas",
    leagues: ["liga-mx"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/mx/pumas.png",
  },
  {
    id: "628d05aa-86b6-4e9a-9f11-5e65829403cc",
    name: "Querétaro",
    leagues: ["liga-mx"],
    imgUrl:
      "https://ik.imagekit.io/2252lb1or/qimela/contenders/mx/queretaro.png",
  },
  {
    id: "27c13f94-f3b6-41cc-8978-1b3bdf60fad6",
    name: "Santos",
    leagues: ["liga-mx"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/mx/santos.png",
  },
  {
    id: "2bbf9a4c-c062-4559-9107-e14c0158acc6",
    name: "Tigres",
    leagues: ["liga-mx"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/mx/tigres.png",
  },
  {
    id: "45ef1f47-45dd-4f61-881e-5e5ea16ffcd5",
    name: "Tijuana",
    leagues: ["liga-mx"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/mx/tijuana.png",
  },
  {
    id: "3f5b0c61-c2ab-4510-83db-63e45bcc4444",
    name: "Toluca",
    leagues: ["liga-mx"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/mx/toluca.png",
  },
  // ── World Cup 2026   ─────────────────────────────────────────────────────────
  {
    id: "f447c60d-d0d5-47ff-8e16-a02cf792ba09",
    name: "México",
    leagues: ["mundial"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/mexico.png",
  },
  {
    id: "cd19d567-d9c9-4de7-b106-3432aafdcd08",
    name: "Sudáfrica",
    leagues: ["mundial"],
    imgUrl:
      "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/sudafrica.png",
  },
  {
    id: "2ea96d69-ab8e-488f-9105-f756a761edfd",
    name: "Corea del Sur",
    leagues: ["mundial"],
    imgUrl:
      "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/coreadelsur.png",
  },
  {
    id: "e66e51b0-c22b-40b1-92a6-fdb14184c4e4",
    name: "República Checa",
    leagues: ["mundial"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/checa.png",
  },
  {
    id: "3a5a755e-8040-49de-9f41-cf69bd3a77dc",
    name: "Canadá",
    leagues: ["mundial"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/canada.png",
  },
  {
    id: "201037fa-282c-4136-b4cb-e993de5f7f78",
    name: "Bosnia",
    leagues: ["mundial"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/bosnia.png",
  },
  {
    id: "f9ac4e4f-9ddb-4077-a41b-4a4eccbb9301",
    name: "Catar",
    leagues: ["mundial"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/catar.png",
  },
  {
    id: "d5be1b6c-d8b8-4be6-acd3-c9afa48665b6",
    name: "Suiza",
    leagues: ["mundial"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/suiza.png",
  },
  {
    id: "abc32016-9222-402d-aebc-c487ce5af7a5",
    name: "Brasil",
    leagues: ["mundial"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/brasil.png",
  },
  {
    id: "8fa929b2-9c85-4a31-a7b8-05a3d1e611e9",
    name: "Marruecos",
    leagues: ["mundial"],
    imgUrl:
      "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/marruecos.png",
  },
  {
    id: "374ee333-1fc6-4157-95d6-a2ff78a3d3be",
    name: "Haití",
    leagues: ["mundial"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/haiti.png",
  },
  {
    id: "d74c9341-84bc-40aa-9854-facb25658546",
    name: "Escocia",
    leagues: ["mundial"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/escocia.png",
  },
  {
    id: "f0985c3a-67bb-478b-ada7-683f53b14088",
    name: "Estados Unidos",
    leagues: ["mundial"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/usa.png",
  },
  {
    id: "da97988b-291e-48a6-a1c2-3a83351da389",
    name: "Paraguay",
    leagues: ["mundial"],
    imgUrl:
      "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/paraguay.png",
  },
  {
    id: "0da50978-01de-493b-bc6a-59af519e8857",
    name: "Australia",
    leagues: ["mundial"],
    imgUrl:
      "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/australia.png",
  },
  {
    id: "58721485-6100-46fb-9a68-3dfc8b9727ef",
    name: "Turquía",
    leagues: ["mundial"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/turquia.png",
  },
  {
    id: "cf929e9d-e31c-4e09-9b60-3c51eb5d34c1",
    name: "Alemania",
    leagues: ["mundial"],
    imgUrl:
      "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/alemania.png",
  },
  {
    id: "2d126880-3388-4a5c-9181-e3af155441a5",
    name: "Curazao",
    leagues: ["mundial"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/curazao.png",
  },
  {
    id: "234eb00d-f701-4834-a500-0ce30e24fbb0",
    name: "Costa de Marfil",
    leagues: ["mundial"],
    imgUrl:
      "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/costademarfil.png",
  },
  {
    id: "fa4b7781-fbb1-4ad9-b5f6-ed192983714e",
    name: "Ecuador",
    leagues: ["mundial"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/ecuador.png",
  },
  {
    id: "cfd7028e-8a07-47d4-bab1-a3a0feced13d",
    name: "Países Bajos",
    leagues: ["mundial"],
    imgUrl:
      "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/paisesbajos.png",
  },
  {
    id: "88253e63-e4ec-4909-8b14-37eb04103a7a",
    name: "Japón",
    leagues: ["mundial"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/japon.png",
  },
  {
    id: "d893ee1e-2116-4a55-bf27-588bd887daf8",
    name: "Suecia",
    leagues: ["mundial"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/suecia.png",
  },
  {
    id: "79c57c7c-beb8-4fcd-9f3c-42c78e7817a8",
    name: "Túnez",
    leagues: ["mundial"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/tunez.png",
  },
  {
    id: "fc710b9f-ae8b-47d8-9ee9-1de1aba181bc",
    name: "Bélgica",
    leagues: ["mundial"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/belgica.png",
  },
  {
    id: "cf445053-f5c0-4fff-9826-5ee97209b3a2",
    name: "Egipto",
    leagues: ["mundial"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/egipto.png",
  },
  {
    id: "021fd438-69dc-447e-a321-ac1c5439e7fe",
    name: "Irán",
    leagues: ["mundial"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/iran.png",
  },
  {
    id: "7a10d184-e2bb-47de-96b0-0f4a9e7cd0fa",
    name: "Nueva Zelanda",
    leagues: ["mundial"],
    imgUrl:
      "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/nuevazelanda.png",
  },
  {
    id: "ee5486c9-1c23-460a-b84a-056948ee94c1",
    name: "España",
    leagues: ["mundial"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/españa.png",
  },
  {
    id: "3f63ddd8-90e5-42d1-a1f1-dd7a2c83c757",
    name: "Cabo Verde",
    leagues: ["mundial"],
    imgUrl:
      "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/caboverde.png",
  },
  {
    id: "3524d28b-5ac5-432d-8f76-6b5cedcb6660",
    name: "Arabia Saudita",
    leagues: ["mundial"],
    imgUrl:
      "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/arabiasaudi.png",
  },
  {
    id: "8a14aecb-d80e-4cee-85d6-b8a067f4e0cc",
    name: "Uruguay",
    leagues: ["mundial"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/uruguay.png",
  },
  {
    id: "ef099d77-3056-46c1-8c1c-39c7f5fb69fd",
    name: "Francia",
    leagues: ["mundial"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/francia.png",
  },
  {
    id: "c853272e-ec43-4476-be8a-fb2609ed8fb8",
    name: "Senegal",
    leagues: ["mundial"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/senegal.png",
  },
  {
    id: "923bcd97-d45b-4db9-ac42-54ed32812761",
    name: "Irak",
    leagues: ["mundial"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/irak.png",
  },
  {
    id: "9c8ebc3d-1f2d-4c43-98dd-89b1beb97f69",
    name: "Noruega",
    leagues: ["mundial"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/noruega.png",
  },
  {
    id: "fdc015a3-f8b2-4bd7-bbe1-a84dae0fd346",
    name: "Argentina",
    leagues: ["mundial"],
    imgUrl:
      "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/argentina.png",
  },
  {
    id: "1709e116-8da6-4a14-b91e-8f37afa84644",
    name: "Argelia",
    leagues: ["mundial"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/argelia.png",
  },
  {
    id: "2e4fb6b6-2b30-4159-af71-1d4def9b8151",
    name: "Austria",
    leagues: ["mundial"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/austria.png",
  },
  {
    id: "7ab6ddff-4ab8-40e7-8367-e83214dbf35e",
    name: "Jordania",
    leagues: ["mundial"],
    imgUrl:
      "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/jordania.png",
  },
  {
    id: "d3a4551a-8ec8-4fad-8fbc-f221eb63a40e",
    name: "Portugal",
    leagues: ["mundial"],
    imgUrl:
      "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/portugal.png",
  },
  {
    id: "3f858b32-c4c4-4804-9fe9-a057df29f091",
    name: "Congo",
    leagues: ["mundial"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/congo.png",
  },
  {
    id: "2fc81e91-901f-42b3-81dd-c639b7bb14d0",
    name: "Uzbekistán",
    leagues: ["mundial"],
    imgUrl:
      "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/uzbekistan.png",
  },
  {
    id: "091be8ee-4d83-4c41-ba79-4f7006110dd2",
    name: "Colombia",
    leagues: ["mundial"],
    imgUrl:
      "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/colombia.png",
  },
  {
    id: "4ce6e1e5-be68-43b4-96b7-b706d08bfb31",
    name: "Inglaterra",
    leagues: ["mundial"],
    imgUrl:
      "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/inglaterra.png",
  },
  {
    id: "cf3cf6fc-9004-497c-9138-97f2f5dccf13",
    name: "Croacia",
    leagues: ["mundial"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/croacia.png",
  },
  {
    id: "f9a8f594-212e-4663-ad1c-c96fb81f3667",
    name: "Ghana",
    leagues: ["mundial"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/ghana.png",
  },
  {
    id: "04c5adc9-5928-4c3c-ba34-4164c383ed9d",
    name: "Panamá",
    leagues: ["mundial"],
    imgUrl: "https://ik.imagekit.io/2252lb1or/qimela/contenders/wc/panama.png",
  },
];

export async function seedContenders(
  prisma: PrismaClient,
  leagues: Record<string, League>,
): Promise<void> {
  for (const data of CONTENDERS) {
    const contender = await prisma.contender.upsert({
      where: { id: data.id },
      update: { name: data.name, imgUrl: data.imgUrl },
      create: { id: data.id, name: data.name, imgUrl: data.imgUrl },
    });

    for (const leagueName of data.leagues) {
      const league = leagues[leagueName];
      if (!league) throw new Error(`League not found in seed: "${leagueName}"`);

      await prisma.contenderLeague.upsert({
        where: {
          contenderId_leagueId: {
            contenderId: contender.id,
            leagueId: league.id,
          },
        },
        update: {},
        create: { contenderId: contender.id, leagueId: league.id },
      });
    }

    console.log(`  [contender] ${contender.name} → ${data.leagues.join(", ")}`);
  }
}
