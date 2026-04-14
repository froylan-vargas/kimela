import { GetEventsForQimelaUseCase } from './get-events-for-qimela.use-case';
import { CoveredStages } from '../../domain/covered-stages.enum';

const SPORT_ID = 'sport-uuid';

const makeEvent = (
  id: string,
  status: 'UPCOMING' | 'ACTIVE',
  phases: { type: string; sessions: { status: string }[] }[],
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
    useCase = new GetEventsForQimelaUseCase(mockPrisma as any);
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

    it('returns empty data array when no events found', async () => {
      // Arrange
      mockPrisma.event.findMany.mockResolvedValue([]);

      // Act
      const result = await useCase.execute(SPORT_ID);

      // Assert
      expect(result.data).toEqual([]);
    });

    it('maps event fields to QimelaEventDto', async () => {
      // Arrange
      const event = makeEvent('e-1', 'UPCOMING', []);
      mockPrisma.event.findMany.mockResolvedValue([event]);

      // Act
      const result = await useCase.execute(SPORT_ID);

      // Assert
      const dto = result.data[0];
      expect(dto.id).toBe('e-1');
      expect(dto.status).toBe('UPCOMING');
      expect(dto.leagueName).toBe('Liga Test');
    });
  });

  describe('availableCoveredStages computation', () => {
    it('includes REGULAR_SEASON when event has a non-completed RS phase', async () => {
      // Arrange
      const event = makeEvent('e-1', 'UPCOMING', [
        { type: 'REGULAR_SEASON', sessions: [{ status: 'SCHEDULED' }] },
      ]);
      mockPrisma.event.findMany.mockResolvedValue([event]);

      // Act
      const result = await useCase.execute(SPORT_ID);

      // Assert
      expect(result.data[0].availableCoveredStages).toContain(CoveredStages.REGULAR_SEASON);
    });

    it('includes PLAYOFFS when event has a non-completed PLAYOFFS phase', async () => {
      // Arrange
      const event = makeEvent('e-1', 'ACTIVE', [
        { type: 'PLAYOFFS', sessions: [{ status: 'SCHEDULED' }] },
      ]);
      mockPrisma.event.findMany.mockResolvedValue([event]);

      // Act
      const result = await useCase.execute(SPORT_ID);

      // Assert
      expect(result.data[0].availableCoveredStages).toContain(CoveredStages.PLAYOFFS);
    });

    it('includes FULL when both RS and PLAYOFFS are available', async () => {
      // Arrange
      const event = makeEvent('e-1', 'UPCOMING', [
        { type: 'REGULAR_SEASON', sessions: [{ status: 'SCHEDULED' }] },
        { type: 'PLAYOFFS', sessions: [{ status: 'SCHEDULED' }] },
      ]);
      mockPrisma.event.findMany.mockResolvedValue([event]);

      // Act
      const result = await useCase.execute(SPORT_ID);

      // Assert
      expect(result.data[0].availableCoveredStages).toContain(CoveredStages.FULL);
    });

    it('does not include REGULAR_SEASON when all RS phases are completed', async () => {
      // Arrange
      const event = makeEvent('e-1', 'ACTIVE', [
        { type: 'REGULAR_SEASON', sessions: [{ status: 'COMPLETED' }] },
        { type: 'PLAYOFFS', sessions: [{ status: 'SCHEDULED' }] },
      ]);
      mockPrisma.event.findMany.mockResolvedValue([event]);

      // Act
      const result = await useCase.execute(SPORT_ID);

      // Assert
      expect(result.data[0].availableCoveredStages).not.toContain(CoveredStages.REGULAR_SEASON);
      expect(result.data[0].availableCoveredStages).not.toContain(CoveredStages.FULL);
      expect(result.data[0].availableCoveredStages).toContain(CoveredStages.PLAYOFFS);
    });

    it('includes REGULAR_SEASON when RS phase has no sessions yet (future phase)', async () => {
      // Arrange
      const event = makeEvent('e-1', 'UPCOMING', [
        { type: 'REGULAR_SEASON', sessions: [] },
      ]);
      mockPrisma.event.findMany.mockResolvedValue([event]);

      // Act
      const result = await useCase.execute(SPORT_ID);

      // Assert
      expect(result.data[0].availableCoveredStages).toContain(CoveredStages.REGULAR_SEASON);
    });

    it('excludes OTHER phase types from all covered stage computations', async () => {
      // Arrange: only OTHER phases exist
      const event = makeEvent('e-1', 'UPCOMING', [
        { type: 'OTHER', sessions: [{ status: 'SCHEDULED' }] },
      ]);
      mockPrisma.event.findMany.mockResolvedValue([event]);

      // Act
      const result = await useCase.execute(SPORT_ID);

      // Assert
      expect(result.data[0].availableCoveredStages).toEqual([]);
    });
  });
});
