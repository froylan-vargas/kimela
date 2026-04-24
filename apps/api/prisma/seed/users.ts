import { PrismaClient, UserRole } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const TEST_PASSWORD = 'finDelCurso22_'
const SALT_ROUNDS = 12

const TEST_USERS: { name: string; email: string; role: UserRole }[] = [
  'rana',
  'sapo',
  'pollo',
  'leon',
  'toro',
  'vaca',
  'perro',
  'gato',
  'pez',
  'tigre',
  'dinosaurio',
  'elefante',
  'rinoceronte',
].map((name) => ({
  name: name.charAt(0).toUpperCase() + name.slice(1),
  email: `${name}@testfroy.com`,
  role: UserRole.USER,
}))

const ADMIN_USERS: { name: string; email: string; role: UserRole }[] = [
  { name: 'Fvargas', email: 'fvargas@testfroy.com', role: UserRole.ADMIN },
]

export async function seedTestUsers(prisma: PrismaClient): Promise<void> {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, SALT_ROUNDS)

  for (const data of [...TEST_USERS, ...ADMIN_USERS]) {
    await prisma.user.upsert({
      where: { email: data.email },
      update: {},
      create: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        emailVerifiedAt: new Date(),
      },
    })
    console.log(`  [user:${data.role.toLowerCase()}] ${data.email}`)
  }
}
