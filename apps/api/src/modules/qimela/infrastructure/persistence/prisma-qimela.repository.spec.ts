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
import { PrismaQimelaRepository } from './prisma-qimela.repository';
import { QimelaStatus } from '../../domain/qimela-status.enum';

const TEST_USER_ID = 'e471c62d-6015-4ab9-b930-79db54ea75c0';
const OTHER_USER_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const TEST_SPORT_ID = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff';

// Helper: wrap PrismaClient as PrismaService for testing
function makePrismaService(client: PrismaClient): PrismaService {
  return client as unknown as PrismaService;
}

describe('PrismaQimelaRepository (integration)', () => {
  let prisma: PrismaClient;
  let repository: PrismaQimelaRepository;

  beforeAll(async () => {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    prisma = new PrismaClient({ adapter });
    await prisma.$connect();
    repository = new PrismaQimelaRepository(makePrismaService(prisma));
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up in dependency order
    await prisma.subscription.deleteMany();
    await prisma.qimela.deleteMany();
    await prisma.user.deleteMany();
    await prisma.sport.deleteMany({ where: { id: TEST_SPORT_ID } });
    await prisma.sport.create({
      data: { id: TEST_SPORT_ID, name: 'Football', slug: 'football', sessionFormat: 'MATCHUP' },
    });
  });

  const createUser = (id: string, email: string) =>
    prisma.user.create({ data: { id, email, name: 'Test User', passwordHash: 'hashed-password' } });

  const createQimela = (creatorId: string, sportId: string, overrides: Partial<{ name: string; status: string }> = {}) =>
    prisma.qimela.create({
      data: {
        name: overrides.name ?? 'Test Qimela',
        sportId,
        status: (overrides.status as never) ?? 'ACTIVE',
        creatorId,
        coveredStages: 'REGULAR_SEASON',
      },
    });

  describe('findForUser', () => {
    it('returns qimelas where user is the creator', async () => {
      // Arrange
      await createUser(TEST_USER_ID, 'creator@test.com');
      await createQimela(TEST_USER_ID, TEST_SPORT_ID, { name: 'My Qimela' });

      // Act
      const result = await repository.findForUser({ userId: TEST_USER_ID });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('My Qimela');
      expect(result[0].creatorId).toBe(TEST_USER_ID);
    });

    it('returns qimelas where user is a subscriber', async () => {
      // Arrange
      await createUser(TEST_USER_ID, 'subscriber@test.com');
      await createUser(OTHER_USER_ID, 'other@test.com');
      const qimela = await createQimela(OTHER_USER_ID, TEST_SPORT_ID, { name: 'Subscribed Qimela' });
      await prisma.subscription.create({
        data: { userId: TEST_USER_ID, qimelaId: qimela.id },
      });

      // Act
      const result = await repository.findForUser({ userId: TEST_USER_ID });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Subscribed Qimela');
    });

    it('returns both creator and subscriber qimelas in a single query', async () => {
      // Arrange
      await createUser(TEST_USER_ID, 'user@test.com');
      await createUser(OTHER_USER_ID, 'other@test.com');
      await createQimela(TEST_USER_ID, TEST_SPORT_ID, { name: 'Created Qimela' });
      const subscribedQimela = await createQimela(OTHER_USER_ID, TEST_SPORT_ID, { name: 'Subscribed Qimela' });
      await prisma.subscription.create({
        data: { userId: TEST_USER_ID, qimelaId: subscribedQimela.id },
      });

      // Act
      const result = await repository.findForUser({ userId: TEST_USER_ID });

      // Assert
      expect(result).toHaveLength(2);
      const names = result.map((k) => k.name).sort();
      expect(names).toEqual(['Created Qimela', 'Subscribed Qimela']);
    });

    it('returns empty array when user has no qimelas', async () => {
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
      await createQimela(TEST_USER_ID, TEST_SPORT_ID, { name: 'Active Qimela', status: 'ACTIVE' });
      await createQimela(TEST_USER_ID, TEST_SPORT_ID, { name: 'Completed Qimela', status: 'COMPLETED' });

      // Act
      const result = await repository.findForUser({
        userId: TEST_USER_ID,
        status: QimelaStatus.ACTIVE,
      });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Active Qimela');
    });

    it('does not return qimelas from other users that user is not subscribed to', async () => {
      // Arrange
      await createUser(TEST_USER_ID, 'user@test.com');
      await createUser(OTHER_USER_ID, 'other@test.com');
      await createQimela(OTHER_USER_ID, TEST_SPORT_ID, { name: 'Other User Qimela' });

      // Act
      const result = await repository.findForUser({ userId: TEST_USER_ID });

      // Assert
      expect(result).toEqual([]);
    });

    it('maps domain entity fields correctly', async () => {
      // Arrange
      await createUser(TEST_USER_ID, 'user@test.com');
      await createQimela(TEST_USER_ID, TEST_SPORT_ID, { name: 'Mapped Qimela' });

      // Act
      const result = await repository.findForUser({ userId: TEST_USER_ID });

      // Assert
      const entity = result[0];
      expect(entity.id).toBeDefined();
      expect(entity.name).toBe('Mapped Qimela');
      expect(entity.sportId).toBe(TEST_SPORT_ID);
      expect(entity.status).toBe(QimelaStatus.ACTIVE);
      expect(entity.creatorId).toBe(TEST_USER_ID);
      expect(entity.createdAt).toBeInstanceOf(Date);
      expect(entity.updatedAt).toBeInstanceOf(Date);
    });
  });
});
