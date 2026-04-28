import { GetEventsForQimelaUseCase } from './get-events-for-qimela.use-case';
import { PrismaService } from '../../../../shared/prisma/prisma.service';

const SPORT_ID = 'sport-uuid';

const makePhase = (id: string, name: string, order: number, status: string = 'UPCOMING') => ({
  id,
  name,
  order,
  status,
});

const makeEvent = (
  id: string,
  status: 'UPCOMING' | 'ACTIVE',
  phases: ReturnType<typeof makePhase>[],
) => ({
  id,
  name: `Event ${id}`,
  startsAt: new Date('2026-05-01'),
  endsAt: null,
  status,
  leagueId: 'league-1',
  league: { name: 'Liga Test' },
  phases,
});

describe('GetEventsForQimelaUseCase', () => {
  let useCase: GetEventsForQimelaUseCase;
  let mockPrisma: { event: { findMany: jest.Mock } };

  beforeEach(() => {
    mockPrisma = { event: { findMany: jest.fn() } };
const mockLogger: any = { trace: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn() };

        useCase = new GetEventsForQimelaUseCase(mockLogger, mockPrisma as unknown as PrismaService);
  });

  describe('execute', () => {
    it('queries both UPCOMING and ACTIVE events for the given sport', async () => {
      // Arrange
      mockPrisma.event.findMany.mockResolvedValue([]);

      // Act
      await useCase.execute(SPORT_ID);

      // Assert
      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['UPCOMING', 'ACTIVE'] },
            league: { sportId: SPORT_ID },
          }),
        }),
      );
    });

    it('excludes ACTIVE phases from the query', async () => {
      // Arrange
      mockPrisma.event.findMany.mockResolvedValue([]);

      // Act
      await useCase.execute(SPORT_ID);

      // Assert
      expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            phases: expect.objectContaining({
              where: { status: { not: 'ACTIVE' } },
            }),
          }),
        }),
      );
    });

    it('returns empty data array when no events found', async () => {
      // Arrange
      mockPrisma.event.findMany.mockResolvedValue([]);

      // Act
      const result = await useCase.execute(SPORT_ID);

      // Assert
      expect(result.data).toEqual([]);
    });

    it('maps event fields to QimelaEventDto including phases', async () => {
      // Arrange
      const phases = [
        makePhase('phase-1', 'Fase 1', 1, 'UPCOMING'),
        makePhase('phase-2', 'Fase 2', 2, 'COMPLETED'),
      ];
      const event = makeEvent('e-1', 'UPCOMING', phases);
      mockPrisma.event.findMany.mockResolvedValue([event]);

      // Act
      const result = await useCase.execute(SPORT_ID);

      // Assert
      const dto = result.data[0];
      expect(dto.id).toBe('e-1');
      expect(dto.status).toBe('UPCOMING');
      expect(dto.leagueName).toBe('Liga Test');
      expect(dto.phases).toHaveLength(2);
    });

    it('maps phase fields correctly in the response', async () => {
      // Arrange
      const phases = [makePhase('phase-1', 'Grupo A', 1, 'UPCOMING')];
      const event = makeEvent('e-1', 'ACTIVE', phases);
      mockPrisma.event.findMany.mockResolvedValue([event]);

      // Act
      const result = await useCase.execute(SPORT_ID);

      // Assert
      const phase = result.data[0].phases[0];
      expect(phase.id).toBe('phase-1');
      expect(phase.name).toBe('Grupo A');
      expect(phase.order).toBe(1);
      expect(phase.status).toBe('UPCOMING');
    });

    it('returns empty phases array when event has no phases', async () => {
      // Arrange
      const event = makeEvent('e-1', 'UPCOMING', []);
      mockPrisma.event.findMany.mockResolvedValue([event]);

      // Act
      const result = await useCase.execute(SPORT_ID);

      // Assert
      expect(result.data[0].phases).toEqual([]);
    });

    it('returns all phases for the event ordered by order', async () => {
      // Arrange
      const phases = [
        makePhase('phase-1', 'Fase 1', 1),
        makePhase('phase-2', 'Fase 2', 2),
        makePhase('phase-3', 'Fase 3', 3),
      ];
      const event = makeEvent('e-1', 'UPCOMING', phases);
      mockPrisma.event.findMany.mockResolvedValue([event]);

      // Act
      const result = await useCase.execute(SPORT_ID);

      // Assert
      expect(result.data[0].phases).toHaveLength(3);
      expect(result.data[0].phases.map((p) => p.order)).toEqual([1, 2, 3]);
    });
  });
});
