import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { seedSports } from './sports'
import { seedLeagues } from './leagues'
import { seedContenders } from './contenders'
import { seedPickCategories } from './pick-categories'
import { seedRules } from './rules'

config()

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding...')
  const sports = await seedSports(prisma)
  const leagues = await seedLeagues(prisma, sports)
  await seedContenders(prisma, leagues)
  await seedPickCategories(prisma, sports)
  await seedRules(prisma)
  console.log('Done.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
