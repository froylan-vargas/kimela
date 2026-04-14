import { GetSportsForQimelaUseCase } from './get-sports-for-qimela.use-case';
import { SportRepository } from '../../../admin/domain/sport.repository';
import { SportEntity } from '../../../admin/domain/sport.entity';

const makeSport = (overrides: Partial<SportEntity> = {}): SportEntity =>
  new SportEntity({
    id: 'sport-1',
    name: 'Soccer',
    imgUrl: null,
    sessionFormat: 'MATCHUP',
    ...overrides,
  });

describe('GetSportsForQimelaUseCase', () => {
  let useCase: GetSportsForQimelaUseCase;
  let mockSportRepository: jest.Mocked<SportRepository>;

  beforeEach(() => {
    mockSportRepository = {
      findAll: jest.fn(),
    };

    useCase = new GetSportsForQimelaUseCase(mockSportRepository);
  });

  describe('execute', () => {
    it('returns empty data array when no sports exist', async () => {
      // Arrange
      mockSportRepository.findAll.mockResolvedValue([]);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result.data).toEqual([]);
    });

    it('maps sport entity fields to SportDto', async () => {
      // Arrange
      const sport = makeSport({ id: 'sport-1', name: 'Soccer', imgUrl: 'https://img.url', sessionFormat: 'MATCHUP' });
      mockSportRepository.findAll.mockResolvedValue([sport]);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual({
        id: 'sport-1',
        name: 'Soccer',
        imgUrl: 'https://img.url',
        sessionFormat: 'MATCHUP',
      });
    });

    it('returns all sports when multiple exist', async () => {
      // Arrange
      const sports = [
        makeSport({ id: 'sport-1', name: 'Soccer' }),
        makeSport({ id: 'sport-2', name: 'F1', sessionFormat: 'RACE' }),
      ];
      mockSportRepository.findAll.mockResolvedValue(sports);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.data.map((s) => s.name)).toEqual(['Soccer', 'F1']);
    });

    it('calls findAll on the sport repository', async () => {
      // Arrange
      mockSportRepository.findAll.mockResolvedValue([]);

      // Act
      await useCase.execute();

      // Assert
      expect(mockSportRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });
});
