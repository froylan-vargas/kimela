import { GetSportsUseCase } from './get-sports.use-case';
import { SportRepository } from '../../domain/sport.repository';
import { SportEntity } from '../../domain/sport.entity';

const makeSport = (overrides: Partial<ConstructorParameters<typeof SportEntity>[0]> = {}): SportEntity =>
  new SportEntity({
    id: 'sport-1',
    name: 'Soccer',
    imgUrl: 'https://example.com/soccer.png',
    sessionFormat: 'MATCHUP',
    ...overrides,
  });

describe('GetSportsUseCase', () => {
  let useCase: GetSportsUseCase;
  let mockSportRepository: jest.Mocked<SportRepository>;

  beforeEach(() => {
    mockSportRepository = {
      findAll: jest.fn(),
    };

const mockLogger: any = { trace: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn(), fatal: jest.fn() };

        useCase = new GetSportsUseCase(mockLogger, mockSportRepository);
  });

  describe('execute', () => {
    it('returns mapped sport DTOs when sports exist', async () => {
      // Arrange
      const sports = [
        makeSport({ id: 'sport-1', name: 'Soccer', sessionFormat: 'MATCHUP' }),
        makeSport({ id: 'sport-2', name: 'F1', sessionFormat: 'RACE', imgUrl: null }),
      ];
      mockSportRepository.findAll.mockResolvedValue(sports);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        id: 'sport-1',
        name: 'Soccer',
        imgUrl: 'https://example.com/soccer.png',
        sessionFormat: 'MATCHUP',
      });
      expect(result.data[1]).toEqual({
        id: 'sport-2',
        name: 'F1',
        imgUrl: null,
        sessionFormat: 'RACE',
      });
    });

    it('returns empty array when no sports exist', async () => {
      // Arrange
      mockSportRepository.findAll.mockResolvedValue([]);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result.data).toEqual([]);
    });
  });
});
