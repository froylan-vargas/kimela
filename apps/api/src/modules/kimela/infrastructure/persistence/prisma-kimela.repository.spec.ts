/**
 * Integration test — requires a real PostgreSQL database.
 * Set DATABASE_URL in your environment before running.
 * See TESTS.md for setup instructions.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../../../.env') });

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { PrismaKimelaRepository } from './prisma-kimela.repository';
import { KimelaStatus } from '../../domain/kimela-status.enum';

const TEST_USER_ID = 'e471c62d-6015-4ab9-b930-79db54ea75c0';
const OTHER_USER_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

// Helper: wrap PrismaClient as PrismaService for testing
function makePrismaService(client: PrismaClient): PrismaService {
  return client as unknown as PrismaService;
}

describe('PrismaKimelaRepository (integration)', () => {
  let prisma: PrismaClient;
  let repository: PrismaKimelaRepository;

  beforeAll(async () => {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    prisma = new PrismaClient({ adapter });
    await prisma.$connect();
    repository = new PrismaKimelaRepository(makePrismaService(prisma));
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up in dependency order
    await prisma.subscription.deleteMany();
    await prisma.kimela.deleteMany();
    await prisma.user.deleteMany();
  });

  const createUser = (id: string, email: string) =>
    prisma.user.create({ data: { id, email, name: 'Test User', passwordHash: 'hashed-password' } });

  const createKimela = (creatorId: string, overrides: Partial<{ name: string; status: string }> = {}) =>
    prisma.kimela.create({
      data: {
        name: overrides.name ?? 'Test Kimela',
        sport: 'football',
        status: (overrides.status as never) ?? 'ACTIVE',
        creatorId,
      },
    });

  describe('findForUser', () => {
    it('returns kimelas where user is the creator', async () => {
      // Arrange
      await createUser(TEST_USER_ID, 'creator@test.com');
      await createKimela(TEST_USER_ID, { name: 'My Kimela' });

      // Act
      const result = await repository.findForUser({ userId: TEST_USER_ID });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('My Kimela');
      expect(result[0].creatorId).toBe(TEST_USER_ID);
    });

    it('returns kimelas where user is a subscriber', async () => {
      // Arrange
      await createUser(TEST_USER_ID, 'subscriber@test.com');
      await createUser(OTHER_USER_ID, 'other@test.com');
      const kimela = await createKimela(OTHER_USER_ID, { name: 'Subscribed Kimela' });
      await prisma.subscription.create({
        data: { userId: TEST_USER_ID, kimelaId: kimela.id },
      });

      // Act
      const result = await repository.findForUser({ userId: TEST_USER_ID });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Subscribed Kimela');
    });

    it('returns both creator and subscriber kimelas in a single query', async () => {
      // Arrange
      await createUser(TEST_USER_ID, 'user@test.com');
      await createUser(OTHER_USER_ID, 'other@test.com');
      await createKimela(TEST_USER_ID, { name: 'Created Kimela' });
      const subscribedKimela = await createKimela(OTHER_USER_ID, { name: 'Subscribed Kimela' });
      await prisma.subscription.create({
        data: { userId: TEST_USER_ID, kimelaId: subscribedKimela.id },
      });

      // Act
      const result = await repository.findForUser({ userId: TEST_USER_ID });

      // Assert
      expect(result).toHaveLength(2);
      const names = result.map((k) => k.name).sort();
      expect(names).toEqual(['Created Kimela', 'Subscribed Kimela']);
    });

    it('returns empty array when user has no kimelas', async () => {
      // Arrange
      await createUser(TEST_USER_ID, 'loner@test.com');

      // Act
      const result = await repository.findForUser({ userId: TEST_USER_ID });

      // Assert
      expect(result).toEqual([]);
    });

    it('filters by status when provided', async () => {
      // Arrange
      await createUser(TEST_USER_ID, 'user@test.com');
      await createKimela(TEST_USER_ID, { name: 'Active Kimela', status: 'ACTIVE' });
      await createKimela(TEST_USER_ID, { name: 'Completed Kimela', status: 'COMPLETED' });

      // Act
      const result = await repository.findForUser({
        userId: TEST_USER_ID,
        status: KimelaStatus.ACTIVE,
      });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Active Kimela');
    });

    it('does not return kimelas from other users that user is not subscribed to', async () => {
      // Arrange
      await createUser(TEST_USER_ID, 'user@test.com');
      await createUser(OTHER_USER_ID, 'other@test.com');
      await createKimela(OTHER_USER_ID, { name: 'Other User Kimela' });

      // Act
      const result = await repository.findForUser({ userId: TEST_USER_ID });

      // Assert
      expect(result).toEqual([]);
    });

    it('maps domain entity fields correctly', async () => {
      // Arrange
      await createUser(TEST_USER_ID, 'user@test.com');
      await createKimela(TEST_USER_ID, { name: 'Mapped Kimela' });

      // Act
      const result = await repository.findForUser({ userId: TEST_USER_ID });

      // Assert
      const entity = result[0];
      expect(entity.id).toBeDefined();
      expect(entity.name).toBe('Mapped Kimela');
      expect(entity.sport).toBe('football');
      expect(entity.status).toBe(KimelaStatus.ACTIVE);
      expect(entity.creatorId).toBe(TEST_USER_ID);
      expect(entity.createdAt).toBeInstanceOf(Date);
      expect(entity.updatedAt).toBeInstanceOf(Date);
    });
  });
});
